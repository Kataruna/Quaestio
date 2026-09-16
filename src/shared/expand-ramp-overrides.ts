import { RAMP_TOKENS, type RampToken } from './ramp-tokens';
import { deriveRampOverrides } from './derive-ramp-overrides';
import type { CssVarOverrides } from './build-palette-style';
import type { PaletteOverrides } from './palette-tokens';

const RAMP_TOKEN_SET = new Set<string>(RAMP_TOKENS);

function expandMode(mode: Partial<Record<string, string>>): Partial<Record<string, string>> {
  const result: Partial<Record<string, string>> = {};
  for (const [key, value] of Object.entries(mode)) {
    if (value === undefined) continue;
    if (RAMP_TOKEN_SET.has(key)) {
      Object.assign(result, deriveRampOverrides(key as RampToken, value));
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Expands any ramp-token entries (ramp-accent/ramp-ink/ramp-neutral) in a
 * stored overrides map into their real CSS-variable overrides (lime-100,
 * ink-900, etc.), leaving semantic-token entries untouched. Runs before
 * buildPaletteStyleTag, which only ever deals in literal CSS variable names.
 */
export function expandRampOverrides(overrides: PaletteOverrides): CssVarOverrides {
  return { light: expandMode(overrides.light), dark: expandMode(overrides.dark) };
}
