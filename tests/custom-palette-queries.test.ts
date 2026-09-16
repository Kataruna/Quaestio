import { describe, expect, it, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import {
  getPaletteOverrides,
  setPaletteOverride,
  resetPalette,
  replacePaletteOverrides,
} from '../src/main/db/custom-palette-queries';

function freshDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

describe('custom-palette-queries', () => {
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = freshDb();
  });

  it('defaults to empty overrides for both modes when no row exists yet', () => {
    expect(getPaletteOverrides(db)).toEqual({ light: {}, dark: {} });
  });

  it('setPaletteOverride adds a token to the given mode', () => {
    setPaletteOverride(db, 'light', 'surface-app', '#ff0000');
    expect(getPaletteOverrides(db)).toEqual({ light: { 'surface-app': '#ff0000' }, dark: {} });
  });

  it('setPaletteOverride with a null value removes that token', () => {
    setPaletteOverride(db, 'light', 'surface-app', '#ff0000');
    setPaletteOverride(db, 'light', 'surface-app', null);
    expect(getPaletteOverrides(db)).toEqual({ light: {}, dark: {} });
  });

  it('keeps light and dark overrides independent', () => {
    setPaletteOverride(db, 'light', 'surface-app', '#ff0000');
    setPaletteOverride(db, 'dark', 'surface-app', '#00ff00');
    expect(getPaletteOverrides(db)).toEqual({
      light: { 'surface-app': '#ff0000' },
      dark: { 'surface-app': '#00ff00' },
    });
  });

  it('resetPalette clears only the given mode', () => {
    setPaletteOverride(db, 'light', 'surface-app', '#ff0000');
    setPaletteOverride(db, 'dark', 'surface-app', '#00ff00');
    resetPalette(db, 'light');
    expect(getPaletteOverrides(db)).toEqual({ light: {}, dark: { 'surface-app': '#00ff00' } });
  });

  it('replacePaletteOverrides overwrites both modes at once', () => {
    setPaletteOverride(db, 'light', 'surface-app', '#ff0000');
    replacePaletteOverrides(db, { light: { 'text-strong': '#111111' }, dark: { 'text-strong': '#eeeeee' } });
    expect(getPaletteOverrides(db)).toEqual({
      light: { 'text-strong': '#111111' },
      dark: { 'text-strong': '#eeeeee' },
    });
  });
});
