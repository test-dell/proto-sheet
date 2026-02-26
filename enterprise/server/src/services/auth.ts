import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { JwtPayload } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = 12;

interface UserRow {
  id: string;
  emp_code: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserResponse {
  id: string;
  empCode: string;
  email: string;
  role: 'admin' | 'user';
}

export async function registerUser(
  empCode: string,
  email: string,
  password: string,
  role: 'admin' | 'user' = 'user'
): Promise<UserResponse> {
  const db = getDb();

  // Check for existing user
  const existing = db
    .prepare('SELECT id FROM users WHERE emp_code = ? OR email = ?')
    .get(empCode, email) as { id: string } | undefined;

  if (existing) {
    throw new Error('User with this employee code or email already exists');
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  db.prepare(
    'INSERT INTO users (id, emp_code, email, password_hash, role) VALUES (?, ?, ?, ?, ?)'
  ).run(id, empCode, email, passwordHash, role);

  logger.info({ empCode, role }, 'User registered');

  return { id, empCode, email, role };
}

export async function loginUser(
  empCode: string,
  password: string
): Promise<{ user: UserResponse; tokens: AuthTokens }> {
  const db = getDb();

  const user = db
    .prepare('SELECT * FROM users WHERE emp_code = ?')
    .get(empCode) as UserRow | undefined;

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  const tokens = generateTokens(user);

  // Store refresh token
  const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
  const expiresAt = new Date(Date.now() + parseDuration(JWT_REFRESH_EXPIRES_IN));

  db.prepare(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
  ).run(uuidv4(), user.id, refreshTokenHash, expiresAt.toISOString());

  // Audit log
  db.prepare(
    'INSERT INTO audit_log (id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)'
  ).run(uuidv4(), user.id, 'LOGIN', 'user', user.id);

  logger.info({ empCode: user.emp_code }, 'User logged in');

  return {
    user: {
      id: user.id,
      empCode: user.emp_code,
      email: user.email,
      role: user.role,
    },
    tokens,
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<AuthTokens> {
  const db = getDb();

  // Verify the refresh token JWT
  let payload: JwtPayload;
  try {
    payload = jwt.verify(refreshToken, JWT_SECRET) as JwtPayload;
  } catch {
    throw new Error('Invalid refresh token');
  }

  // Find non-revoked tokens for this user
  const storedTokens = db
    .prepare(
      'SELECT * FROM refresh_tokens WHERE user_id = ? AND revoked_at IS NULL AND expires_at > datetime(?)'
    )
    .all(payload.userId, new Date().toISOString()) as Array<{
    id: string;
    token_hash: string;
  }>;

  // Verify against stored hashes
  let matchedTokenId: string | null = null;
  for (const stored of storedTokens) {
    const matches = await bcrypt.compare(refreshToken, stored.token_hash);
    if (matches) {
      matchedTokenId = stored.id;
      break;
    }
  }

  if (!matchedTokenId) {
    throw new Error('Refresh token not found or revoked');
  }

  // Revoke old refresh token (rotation)
  db.prepare('UPDATE refresh_tokens SET revoked_at = datetime(?) WHERE id = ?').run(
    new Date().toISOString(),
    matchedTokenId
  );

  // Get fresh user data
  const user = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(payload.userId) as UserRow | undefined;

  if (!user) {
    throw new Error('User not found');
  }

  // Generate new tokens
  const tokens = generateTokens(user);

  // Store new refresh token
  const newRefreshHash = await bcrypt.hash(tokens.refreshToken, 10);
  const expiresAt = new Date(Date.now() + parseDuration(JWT_REFRESH_EXPIRES_IN));

  db.prepare(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
  ).run(uuidv4(), user.id, newRefreshHash, expiresAt.toISOString());

  return tokens;
}

export async function logoutUser(userId: string): Promise<void> {
  const db = getDb();

  // Revoke all refresh tokens for this user
  db.prepare('UPDATE refresh_tokens SET revoked_at = datetime(?) WHERE user_id = ? AND revoked_at IS NULL').run(
    new Date().toISOString(),
    userId
  );

  db.prepare(
    'INSERT INTO audit_log (id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)'
  ).run(uuidv4(), userId, 'LOGOUT', 'user', userId);

  logger.info({ userId }, 'User logged out');
}

function generateTokens(user: UserRow): AuthTokens {
  const payload: JwtPayload = {
    userId: user.id,
    empCode: user.emp_code,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 24 * 60 * 60 * 1000; // Default 24h

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}
