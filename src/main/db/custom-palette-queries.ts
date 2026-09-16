import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { PaletteMode, PaletteOverrides, AnyPaletteToken } from '@shared/palette-tokens';
import { customPalette } from './schema';

const ROW_ID = 1;
const EMPTY: PaletteOverrides = { light: {}, dark: {} };

function readRow(db: BetterSQLite3Database): PaletteOverrides {
  const row = db.select().from(customPalette).where(eq(customPalette.id, ROW_ID)).get();
  if (!row) return EMPTY;
  try {
    const parsed = JSON.parse(row.overrides) as Partial<PaletteOverrides>;
    return { light: parsed.light ?? {}, dark: parsed.dark ?? {} };
  } catch {
    // A corrupt row self-heals the same way tab-layout-queries does: treat
    // it as empty rather than throwing and breaking every settings read.
    return EMPTY;
  }
}

function writeRow(db: BetterSQLite3Database, overrides: PaletteOverrides): void {
  const json = JSON.stringify(overrides);
  db.insert(customPalette)
    .values({ id: ROW_ID, overrides: json })
    .onConflictDoUpdate({ target: customPalette.id, set: { overrides: json } })
    .run();
}

export function getPaletteOverrides(db: BetterSQLite3Database): PaletteOverrides {
  return readRow(db);
}

export function setPaletteOverride(
  db: BetterSQLite3Database,
  mode: PaletteMode,
  token: AnyPaletteToken,
  value: string | null,
): void {
  const current = readRow(db);
  const nextMode = { ...current[mode] };
  if (value === null) {
    delete nextMode[token];
  } else {
    nextMode[token] = value;
  }
  writeRow(db, { ...current, [mode]: nextMode });
}

export function resetPalette(db: BetterSQLite3Database, mode: PaletteMode): void {
  const current = readRow(db);
  writeRow(db, { ...current, [mode]: {} });
}

export function replacePaletteOverrides(db: BetterSQLite3Database, overrides: PaletteOverrides): void {
  writeRow(db, overrides);
}
