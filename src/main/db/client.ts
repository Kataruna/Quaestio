import { app } from 'electron';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import path from 'node:path';

const DB_FILE_NAME = 'quaestio.db';

let db: BetterSQLite3Database | null = null;

function dbFilePath(): string {
  return path.join(app.getPath('userData'), DB_FILE_NAME);
}

/**
 * Where the generated SQL migrations live at runtime. In dev, the bundled
 * main entry is `.vite/build/main.js`, so `../../drizzle` resolves to the
 * project root's `drizzle/` folder. In a packaged app, `drizzle/` isn't
 * inside the asar archive — `forge.config.ts`'s `extraResource` copies it
 * next to the app instead, reachable via `process.resourcesPath`.
 */
function migrationsFolder(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'drizzle')
    : path.join(__dirname, '../../drizzle');
}

/** Opens the SQLite file (creating it on first launch) and wraps it with
 * Drizzle. Safe to call more than once — the connection is memoized. */
export function getDb(): BetterSQLite3Database {
  if (!db) {
    const sqlite = new Database(dbFilePath());
    db = drizzle(sqlite);
  }
  return db;
}

/** Runs any migrations not yet applied. Must be called once at startup,
 * before any query touches the database. */
export function runMigrations(): void {
  migrate(getDb(), { migrationsFolder: migrationsFolder() });
}
