import oracledb from 'oracledb';
import { initializeSchema } from './schema.js';
import logger from '../utils/logger.js';

let pool: oracledb.Pool | null = null;

/**
 * Initialize the Oracle connection pool and create schema.
 */
export async function initializeDatabase(): Promise<void> {
  if (pool) return;

  // Use Thin mode (no Oracle Client needed) — available in oracledb 6.x+
  oracledb.initOracleClient?.();

  // Configure oracledb defaults
  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
  oracledb.autoCommit = false;
  oracledb.fetchAsString = [oracledb.CLOB];

  pool = await oracledb.createPool({
    user: process.env.ORACLE_USER || 'da_sheet_admin',
    password: process.env.ORACLE_PASSWORD || 'admin123',
    connectString: process.env.ORACLE_CONNECTION_STRING || 'localhost:1521/XEPDB1',
    poolMin: Number(process.env.ORACLE_POOL_MIN) || 2,
    poolMax: Number(process.env.ORACLE_POOL_MAX) || 10,
    poolIncrement: 1,
  });

  logger.info('Oracle connection pool created');

  // Initialize schema
  const connection = await pool.getConnection();
  try {
    await initializeSchema(connection);
  } finally {
    await connection.close();
  }
}

/**
 * Get a connection from the pool.
 * Caller MUST close the connection when done (use try/finally).
 */
export async function getConnection(): Promise<oracledb.Connection> {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool.getConnection();
}

/**
 * Close the connection pool (for graceful shutdown).
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close(10); // 10 second drain timeout
    pool = null;
    logger.info('Oracle connection pool closed');
  }
}

/**
 * Convenience: execute a query with auto-managed connection.
 * Automatically gets and releases a connection.
 */
export async function execute<T = Record<string, unknown>>(
  sql: string,
  binds: oracledb.BindParameters = {},
  options: oracledb.ExecuteOptions = {}
): Promise<oracledb.Result<T>> {
  const connection = await getConnection();
  try {
    const result = await connection.execute<T>(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      ...options,
    });
    return result;
  } finally {
    await connection.close();
  }
}

/**
 * Execute a query and auto-commit.
 */
export async function executeWithCommit<T = Record<string, unknown>>(
  sql: string,
  binds: oracledb.BindParameters = {},
  options: oracledb.ExecuteOptions = {}
): Promise<oracledb.Result<T>> {
  const connection = await getConnection();
  try {
    const result = await connection.execute<T>(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: true,
      ...options,
    });
    return result;
  } finally {
    await connection.close();
  }
}

/**
 * Run multiple statements within a single transaction.
 * If the callback throws, the transaction is rolled back.
 */
export async function transaction<T>(
  callback: (connection: oracledb.Connection) => Promise<T>
): Promise<T> {
  const connection = await getConnection();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}
