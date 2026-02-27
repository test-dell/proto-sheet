import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getConnection, transaction } from '../db/index.js';
import { JwtPayload } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = 12;

// Oracle returns uppercase column names by default
interface UserRow {
  ID: string;
  EMP_CODE: string;
  EMAIL: string;
  PASSWORD_HASH: string;
  ROLE: 'admin' | 'user';
  CREATED_AT: string;
  UPDATED_AT: string;
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
  const connection = await getConnection();
  try {
    // Check for existing user
    const existing = await connection.execute<{ ID: string }>(
      `SELECT id FROM users WHERE emp_code = :empCode OR email = :email`,
      { empCode, email }
    );

    if (existing.rows && existing.rows.length > 0) {
      throw new Error('User with this employee code or email already exists');
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await connection.execute(
      `INSERT INTO users (id, emp_code, email, password_hash, role)
       VALUES (:id, :empCode, :email, :passwordHash, :role)`,
      { id, empCode, email, passwordHash, role }
    );

    await connection.commit();
    logger.info({ empCode, role }, 'User registered');

    return { id, empCode, email, role };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

export async function loginUser(
  empCode: string,
  password: string
): Promise<{ user: UserResponse; tokens: AuthTokens }> {
  return transaction(async (connection) => {
    const result = await connection.execute<UserRow>(
      `SELECT * FROM users WHERE emp_code = :empCode`,
      { empCode }
    );

    const user = result.rows?.[0];
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.PASSWORD_HASH);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const tokens = generateTokens(user);

    // Store refresh token
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    const expiresAt = new Date(Date.now() + parseDuration(JWT_REFRESH_EXPIRES_IN));

    await connection.execute(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
       VALUES (:id, :userId, :tokenHash, :expiresAt)`,
      {
        id: uuidv4(),
        userId: user.ID,
        tokenHash: refreshTokenHash,
        expiresAt,
      }
    );

    // Audit log
    await connection.execute(
      `INSERT INTO audit_log (id, user_id, action, entity_type, entity_id)
       VALUES (:id, :userId, :action, :entityType, :entityId)`,
      {
        id: uuidv4(),
        userId: user.ID,
        action: 'LOGIN',
        entityType: 'user',
        entityId: user.ID,
      }
    );

    logger.info({ empCode: user.EMP_CODE }, 'User logged in');

    return {
      user: {
        id: user.ID,
        empCode: user.EMP_CODE,
        email: user.EMAIL,
        role: user.ROLE,
      },
      tokens,
    };
  });
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<AuthTokens> {
  // Verify the refresh token JWT
  let payload: JwtPayload;
  try {
    payload = jwt.verify(refreshToken, JWT_SECRET) as JwtPayload;
  } catch {
    throw new Error('Invalid refresh token');
  }

  return transaction(async (connection) => {
    // Find non-revoked tokens for this user
    const result = await connection.execute<{ ID: string; TOKEN_HASH: string }>(
      `SELECT id, token_hash FROM refresh_tokens
       WHERE user_id = :userId AND revoked_at IS NULL AND expires_at > :now`,
      { userId: payload.userId, now: new Date() }
    );

    const storedTokens = result.rows || [];

    // Verify against stored hashes
    let matchedTokenId: string | null = null;
    for (const stored of storedTokens) {
      const matches = await bcrypt.compare(refreshToken, stored.TOKEN_HASH);
      if (matches) {
        matchedTokenId = stored.ID;
        break;
      }
    }

    if (!matchedTokenId) {
      throw new Error('Refresh token not found or revoked');
    }

    // Revoke old refresh token (rotation)
    await connection.execute(
      `UPDATE refresh_tokens SET revoked_at = SYSTIMESTAMP WHERE id = :id`,
      { id: matchedTokenId }
    );

    // Get fresh user data
    const userResult = await connection.execute<UserRow>(
      `SELECT * FROM users WHERE id = :id`,
      { id: payload.userId }
    );

    const user = userResult.rows?.[0];
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    // Store new refresh token
    const newRefreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    const expiresAt = new Date(Date.now() + parseDuration(JWT_REFRESH_EXPIRES_IN));

    await connection.execute(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
       VALUES (:id, :userId, :tokenHash, :expiresAt)`,
      {
        id: uuidv4(),
        userId: user.ID,
        tokenHash: newRefreshHash,
        expiresAt,
      }
    );

    return tokens;
  });
}

export async function logoutUser(userId: string): Promise<void> {
  return transaction(async (connection) => {
    // Revoke all refresh tokens for this user
    await connection.execute(
      `UPDATE refresh_tokens SET revoked_at = SYSTIMESTAMP
       WHERE user_id = :userId AND revoked_at IS NULL`,
      { userId }
    );

    await connection.execute(
      `INSERT INTO audit_log (id, user_id, action, entity_type, entity_id)
       VALUES (:id, :userId, :action, :entityType, :entityId)`,
      {
        id: uuidv4(),
        userId,
        action: 'LOGOUT',
        entityType: 'user',
        entityId: userId,
      }
    );

    logger.info({ userId }, 'User logged out');
  });
}

function generateTokens(user: UserRow): AuthTokens {
  const payload: JwtPayload = {
    userId: user.ID,
    empCode: user.EMP_CODE,
    role: user.ROLE,
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
