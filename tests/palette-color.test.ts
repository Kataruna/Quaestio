import { describe, expect, it } from 'vitest';
import { parseColor, withAlpha } from '../src/shared/palette-color';

describe('parseColor', () => {
  it('parses a 6-digit hex as fully opaque', () => {
    expect(parseColor('#f4f4f1')).toEqual({ hex: '#f4f4f1', alpha: 1 });
  });

  it('parses an rgba() string into hex + alpha', () => {
    expect(parseColor('rgba(255, 255, 255, 0.1)')).toEqual({ hex: '#ffffff', alpha: 0.1 });
  });

  it('parses rgba() with no spaces after commas', () => {
    expect(parseColor('rgba(14,15,16,0.55)')).toEqual({ hex: '#0e0f10', alpha: 0.55 });
  });

  it('pads single-digit hex components with a leading zero', () => {
    expect(parseColor('rgba(5, 6, 5, 0.66)')).toEqual({ hex: '#050605', alpha: 0.66 });
  });
});

describe('withAlpha', () => {
  it('returns the plain hex unchanged when alpha is 1', () => {
    expect(withAlpha('#c7f24c', 1)).toBe('#c7f24c');
  });

  it('returns an rgba() string when alpha is less than 1', () => {
    expect(withAlpha('#ffffff', 0.1)).toBe('rgba(255, 255, 255, 0.1)');
  });

  it('round-trips through parseColor', () => {
    const original = 'rgba(199, 242, 76, 0.12)';
    const { hex, alpha } = parseColor(original);
    expect(withAlpha(hex, alpha)).toBe(original);
  });
});
