import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

/**
 * Unit tests for auth utilities.
 *
 * These tests verify password hashing, JWT generation, and UUID generation
 * without requiring an Oracle database connection. Integration tests that
 * exercise the full auth flow against Oracle should be run separately
 * with a test database.
 */

const JWT_SECRET = 'test-secret-key';
const JWT_REFRESH_SECRET = 'test-refresh-secret-key';

describe('Auth utilities (unit tests)', () => {
  describe('Password hashing', () => {
    it('should hash a password with bcrypt', async () => {
      const password = 'Test@1234';
      const hash = await bcrypt.hash(password, 12);

      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[aby]?\$/);
    });

    it('should verify correct password against hash', async () => {
      const password = 'Admin@1234';
      const hash = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password against hash', async () => {
      const password = 'Admin@1234';
      const hash = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare('WrongPassword', hash);
      expect(isValid).toBe(false);
    });

    it('should produce different hashes for same password (salt)', async () => {
      const password = 'Test@1234';
      const hash1 = await bcrypt.hash(password, 12);
      const hash2 = await bcrypt.hash(password, 12);

      expect(hash1).not.toBe(hash2);
      // Both should still verify
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });
  });

  describe('JWT token generation', () => {
    it('should create a valid access token', () => {
      const userId = uuidv4();
      const payload = { userId, role: 'admin' };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });

      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
      expect(decoded.userId).toBe(userId);
      expect(decoded.role).toBe('admin');
      expect(decoded.exp).toBeDefined();
    });

    it('should create a valid refresh token', () => {
      const userId = uuidv4();
      const payload = { userId, type: 'refresh' };

      const token = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as jwt.JwtPayload;
      expect(decoded.userId).toBe(userId);
      expect(decoded.type).toBe('refresh');
    });

    it('should reject token with wrong secret', () => {
      const token = jwt.sign({ userId: uuidv4() }, JWT_SECRET, { expiresIn: '15m' });

      expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
    });

    it('should reject expired token', () => {
      const token = jwt.sign(
        { userId: uuidv4() },
        JWT_SECRET,
        { expiresIn: '0s' }
      );

      // Token is already expired
      expect(() => jwt.verify(token, JWT_SECRET)).toThrow('jwt expired');
    });
  });

  describe('UUID generation', () => {
    it('should generate valid v4 UUIDs', () => {
      const id = uuidv4();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should generate unique UUIDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => uuidv4()));
      expect(ids.size).toBe(100);
    });
  });
});
