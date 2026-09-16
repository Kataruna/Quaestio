import { describe, expect, it } from 'vitest';
import { PALETTE_TOKENS, PALETTE_GROUPS, PALETTE_DEFAULTS, ALL_TOKENS } from '../src/shared/palette-tokens';
import { RAMP_TOKENS } from '../src/shared/ramp-tokens';

describe('palette-tokens', () => {
  it('has exactly 22 tokens (surface-accent/-soft removed, replaced by ramp customization)', () => {
    expect(PALETTE_TOKENS).toHaveLength(22);
  });

  it('no longer includes surface-accent or surface-accent-soft', () => {
    expect(PALETTE_TOKENS).not.toContain('surface-accent');
    expect(PALETTE_TOKENS).not.toContain('surface-accent-soft');
  });

  it('has no duplicate tokens', () => {
    expect(new Set(PALETTE_TOKENS).size).toBe(PALETTE_TOKENS.length);
  });

  it('every token appears in exactly one group', () => {
    const grouped = PALETTE_GROUPS.flatMap((group) => group.tokens);
    expect(grouped.slice().sort()).toEqual(PALETTE_TOKENS.slice().sort());
  });

  it('every token has a light and dark default', () => {
    for (const token of PALETTE_TOKENS) {
      expect(PALETTE_DEFAULTS.light[token]).toBeTruthy();
      expect(PALETTE_DEFAULTS.dark[token]).toBeTruthy();
    }
  });

  it('matches the known default for surface-app in both modes', () => {
    expect(PALETTE_DEFAULTS.light['surface-app']).toBe('#f4f4f1');
    expect(PALETTE_DEFAULTS.dark['surface-app']).toBe('#0b0c0b');
  });

  it('ALL_TOKENS combines the semantic tokens and the ramp tokens', () => {
    expect(ALL_TOKENS).toHaveLength(PALETTE_TOKENS.length + RAMP_TOKENS.length);
    for (const token of PALETTE_TOKENS) expect(ALL_TOKENS).toContain(token);
    for (const token of RAMP_TOKENS) expect(ALL_TOKENS).toContain(token);
  });
});
