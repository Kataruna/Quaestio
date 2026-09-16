import { PALETTE_TOKENS, type PaletteMode, type PaletteOverrides, type PaletteToken } from './palette-tokens';

const KNOWN_TOKENS = new Set<string>(PALETTE_TOKENS);

function sanitizeMode(value: unknown): Partial<Record<PaletteToken, string>> {
  const result: Partial<Record<PaletteToken, string>> = {};
  if (typeof value !== 'object' || value === null) return result;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (KNOWN_TOKENS.has(key) && typeof entry === 'string') {
      result[key as PaletteToken] = entry;
    }
  }
  return result;
}

/**
 * Untrusted input from a file the user picked — never trust its shape.
 * Unknown keys are dropped rather than rejected (so an export from a
 * slightly newer/older version of this app still imports), but the root
 * itself must be a JSON object or there's nothing sensible to read.
 */
export function validatePaletteImport(raw: unknown): PaletteOverrides {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Palette file must be a JSON object.');
  }
  const obj = raw as Record<PaletteMode, unknown>;
  return { light: sanitizeMode(obj.light), dark: sanitizeMode(obj.dark) };
}
