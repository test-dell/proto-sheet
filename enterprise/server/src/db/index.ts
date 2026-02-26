import Database from 'better-sqlite3';
import { initializeDatabase } from './schema.js';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = initializeDatabase(process.env.DATABASE_URL);
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// For testing: allow injecting a different database
export function setDb(database: Database.Database): void {
  db = database;
}
