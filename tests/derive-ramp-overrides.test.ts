import { describe, expect, it } from 'vitest';
import { deriveRampOverrides } from '../src/shared/derive-ramp-overrides';

describe('deriveRampOverrides', () => {
  it("returns the picked color unchanged at the ramp's own anchor shade", () => {
    const result = deriveRampOverrides('ramp-accent', '#c7f24c');
    expect(result['lime-400']).toBe('#c7f24c');
  });

  it('derives every accent shade from a picked red, preserving the lightness progression', () => {
    const result = deriveRampOverrides('ramp-accent', '#ff0000');
    expect(result).toEqual({
      'lime-100': '#ff9696',
      'lime-200': '#ff6666',
      'lime-300': '#ff3434',
      'lime-400': '#ff0000',
      'lime-500': '#d30000',
      'lime-600': '#a50000',
      'lime-700': '#640000',
    });
  });

  it('clamps derived shades that would exceed 100% lightness rather than overflowing', () => {
    const result = deriveRampOverrides('ramp-accent', '#ffffff');
    // Shades lighter than the anchor default all clamp to white; darker ones don't need to.
    expect(result['lime-100']).toBe('#ffffff');
    expect(result['lime-200']).toBe('#ffffff');
    expect(result['lime-300']).toBe('#ffffff');
    expect(result['lime-400']).toBe('#ffffff');
    expect(result['lime-500']).toBe('#e9e9e9');
    expect(result['lime-600']).toBe('#d2d2d2');
    expect(result['lime-700']).toBe('#b2b2b2');
  });

  it('uses the correct CSS variable family and shade count for the ink ramp', () => {
    const result = deriveRampOverrides('ramp-ink', '#0e0f10');
    expect(Object.keys(result).sort()).toEqual(['ink-600', 'ink-700', 'ink-800', 'ink-900']);
    expect(result['ink-900']).toBe('#0e0f10');
  });

  it('uses the correct CSS variable family and shade count for the neutral ramp', () => {
    const result = deriveRampOverrides('ramp-neutral', '#b4b5ae');
    expect(Object.keys(result)).toHaveLength(10);
    expect(result['neutral-400']).toBe('#b4b5ae');
  });
});
