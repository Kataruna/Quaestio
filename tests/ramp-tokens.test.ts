import { describe, expect, it } from 'vitest';
import {
  RAMP_TOKENS,
  RAMP_LABELS,
  RAMP_FAMILY,
  RAMP_ANCHOR_SHADE,
  RAMP_SHADE_DEFAULTS,
  RAMP_ANCHOR_DEFAULTS,
} from '../src/shared/ramp-tokens';

describe('ramp-tokens', () => {
  it('has exactly 3 ramp tokens, named for role not color', () => {
    expect(RAMP_TOKENS).toEqual(['ramp-accent', 'ramp-ink', 'ramp-neutral']);
  });

  it('every ramp token has a label, family, anchor shade, and shade table', () => {
    for (const token of RAMP_TOKENS) {
      expect(RAMP_LABELS[token]).toBeTruthy();
      expect(RAMP_FAMILY[token]).toBeTruthy();
      expect(RAMP_ANCHOR_SHADE[token]).toBeTypeOf('number');
      expect(RAMP_SHADE_DEFAULTS[token]).toBeTruthy();
    }
  });

  it('labels match the design (Accent/Ink/Neutral)', () => {
    expect(RAMP_LABELS['ramp-accent']).toBe('Accent');
    expect(RAMP_LABELS['ramp-ink']).toBe('Ink');
    expect(RAMP_LABELS['ramp-neutral']).toBe('Neutral');
  });

  it('maps each ramp token to its real CSS variable family', () => {
    expect(RAMP_FAMILY['ramp-accent']).toBe('lime');
    expect(RAMP_FAMILY['ramp-ink']).toBe('ink');
    expect(RAMP_FAMILY['ramp-neutral']).toBe('neutral');
  });

  it('the accent ramp has exactly 7 shades, ink has 4, neutral has 10', () => {
    expect(Object.keys(RAMP_SHADE_DEFAULTS['ramp-accent'])).toHaveLength(7);
    expect(Object.keys(RAMP_SHADE_DEFAULTS['ramp-ink'])).toHaveLength(4);
    expect(Object.keys(RAMP_SHADE_DEFAULTS['ramp-neutral'])).toHaveLength(10);
  });

  it("each ramp's anchor default equals its shade table's value at the anchor shade", () => {
    for (const token of RAMP_TOKENS) {
      const anchorShade = RAMP_ANCHOR_SHADE[token];
      expect(RAMP_ANCHOR_DEFAULTS[token]).toBe(RAMP_SHADE_DEFAULTS[token][anchorShade]);
    }
  });

  it('matches the known default values for the accent ramp', () => {
    expect(RAMP_SHADE_DEFAULTS['ramp-accent']).toEqual({
      100: '#f1fbd9',
      200: '#e2f8ac',
      300: '#d4f57d',
      400: '#c7f24c',
      500: '#b6e230',
      600: '#9cc81c',
      700: '#6e8f14',
    });
    expect(RAMP_ANCHOR_DEFAULTS['ramp-accent']).toBe('#c7f24c');
  });
});
