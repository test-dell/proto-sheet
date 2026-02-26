import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeDatabase } from '../src/db/schema';
import { setDb, closeDb } from '../src/db/index';
import { registerUser, loginUser, logoutUser } from '../src/services/auth';

describe('Auth Service', () => {
  let db: Database.Database;

  beforeEach(() => {
    // Use in-memory database for tests
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Initialize schema in memory
    const initDb = initializeDatabase(':memory:');
    // We need to use our test db
    db = initDb;
    setDb(db);
  });

  afterEach(() => {
    closeDb();
  });

  describe('registerUser', () => {
    it('should create a new user', async () => {
      const user = await registerUser('EMP001', 'test@test.com', 'Test@1234', 'user');

      expect(user.empCode).toBe('EMP001');
      expect(user.email).toBe('test@test.com');
      expect(user.role).toBe('user');
      expect(user.id).toBeDefined();
    });

    it('should hash the password', async () => {
      await registerUser('EMP002', 'test2@test.com', 'Test@1234', 'user');

      const row = db.prepare('SELECT password_hash FROM users WHERE emp_code = ?').get('EMP002') as {
        password_hash: string;
      };

      expect(row.password_hash).not.toBe('Test@1234');
      expect(row.password_hash).toMatch(/^\$2[aby]?\$/);
    });

    it('should reject duplicate emp_code', async () => {
      await registerUser('EMP003', 'test3@test.com', 'Test@1234', 'user');

      await expect(
        registerUser('EMP003', 'different@test.com', 'Test@1234', 'user')
      ).rejects.toThrow('already exists');
    });

    it('should reject duplicate email', async () => {
      await registerUser('EMP004', 'same@test.com', 'Test@1234', 'user');

      await expect(
        registerUser('EMP005', 'same@test.com', 'Test@1234', 'user')
      ).rejects.toThrow('already exists');
    });
  });

  describe('loginUser', () => {
    beforeEach(async () => {
      await registerUser('LOGIN001', 'login@test.com', 'Test@1234', 'admin');
    });

    it('should return user and tokens on valid credentials', async () => {
      const result = await loginUser('LOGIN001', 'Test@1234');

      expect(result.user.empCode).toBe('LOGIN001');
      expect(result.user.role).toBe('admin');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should reject invalid password', async () => {
      await expect(loginUser('LOGIN001', 'WrongPassword')).rejects.toThrow('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      await expect(loginUser('NOPE', 'Test@1234')).rejects.toThrow('Invalid credentials');
    });

    it('should create audit log entry', async () => {
      await loginUser('LOGIN001', 'Test@1234');

      const log = db
        .prepare("SELECT * FROM audit_log WHERE action = 'LOGIN'")
        .get() as { action: string; entity_type: string };

      expect(log).toBeDefined();
      expect(log.action).toBe('LOGIN');
      expect(log.entity_type).toBe('user');
    });

    it('should store refresh token', async () => {
      const result = await loginUser('LOGIN001', 'Test@1234');

      const tokens = db
        .prepare('SELECT * FROM refresh_tokens WHERE user_id = ?')
        .all(result.user.id);

      expect(tokens.length).toBe(1);
    });
  });

  describe('logoutUser', () => {
    it('should revoke all refresh tokens', async () => {
      const result = await loginUser('LOGIN001', 'Test@1234');

      await logoutUser(result.user.id);

      const active = db
        .prepare('SELECT * FROM refresh_tokens WHERE user_id = ? AND revoked_at IS NULL')
        .all(result.user.id);

      expect(active.length).toBe(0);
    });
  });
});
