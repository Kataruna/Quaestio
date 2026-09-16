import { describe, expect, it } from 'vitest';
import { hexToHsl, hslToHex } from '../src/shared/hsl-color';

describe('hexToHsl', () => {
  it('converts white to 0 saturation, 100 lightness', () => {
    const { s, l } = hexToHsl('#ffffff');
    expect(s).toBeCloseTo(0, 5);
    expect(l).toBeCloseTo(100, 5);
  });

  it('converts black to 0 saturation, 0 lightness', () => {
    const { s, l } = hexToHsl('#000000');
    expect(s).toBeCloseTo(0, 5);
    expect(l).toBeCloseTo(0, 5);
  });

  it('converts pure red to hue 0, full saturation, 50 lightness', () => {
    const { h, s, l } = hexToHsl('#ff0000');
    expect(h).toBeCloseTo(0, 5);
    expect(s).toBeCloseTo(100, 5);
    expect(l).toBeCloseTo(50, 5);
  });

  it('matches the known HSL for the default accent color', () => {
    const { h, s, l } = hexToHsl('#c7f24c');
    expect(h).toBeCloseTo(75.5422, 3);
    expect(s).toBeCloseTo(86.4583, 3);
    expect(l).toBeCloseTo(62.3529, 3);
  });
});

describe('hslToHex', () => {
  it('converts hue 0, full saturation, 50 lightness back to pure red', () => {
    expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe('#ff0000');
  });

  it('round-trips the default accent color exactly', () => {
    expect(hslToHex(hexToHsl('#c7f24c'))).toBe('#c7f24c');
  });

  it('round-trips white and black', () => {
    expect(hslToHex(hexToHsl('#ffffff'))).toBe('#ffffff');
    expect(hslToHex(hexToHsl('#000000'))).toBe('#000000');
  });
});
