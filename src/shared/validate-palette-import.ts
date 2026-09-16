import { ALL_TOKENS, type PaletteMode, type PaletteOverrides, type AnyPaletteToken } from './palette-tokens';
import { RAMP_TOKENS } from './ramp-tokens';
import { RGBA_PATTERN } from './palette-color';

const KNOWN_TOKENS = new Set<string>(ALL_TOKENS);
const RAMP_TOKEN_SET = new Set<string>(RAMP_TOKENS);

/** The only two shapes this app's own values ever take — see palette-color.ts. */
const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

/**
 * Ramp tokens feed straight into hexToHsl (derive-ramp-overrides.ts), which only
 * parses 6-digit hex — an rgba() value there silently produces #NaNNaNNaN for
 * every derived shade. Semantic tokens have no such downstream math, so they keep
 * accepting both formats.
 */
function isValidColorValue(key: string, entry: string): boolean {
  if (RAMP_TOKEN_SET.has(key)) return HEX_PATTERN.test(entry);
  return HEX_PATTERN.test(entry) || RGBA_PATTERN.test(entry);
}

function sanitizeMode(value: unknown): Partial<Record<AnyPaletteToken, string>> {
  const result: Partial<Record<AnyPaletteToken, string>> = {};
  if (typeof value !== 'object' || value === null) return result;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (KNOWN_TOKENS.has(key) && typeof entry === 'string' && isValidColorValue(key, entry)) {
      result[key as AnyPaletteToken] = entry;
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
