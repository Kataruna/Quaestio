import { describe, expect, it } from 'vitest';
import { PALETTE_TOKENS, PALETTE_GROUPS, PALETTE_DEFAULTS } from '../src/shared/palette-tokens';

describe('palette-tokens', () => {
  it('has exactly 24 tokens', () => {
    expect(PALETTE_TOKENS).toHaveLength(24);
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
});
