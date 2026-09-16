import { describe, expect, it } from 'vitest';
import { validatePaletteImport } from '../src/shared/validate-palette-import';

describe('validatePaletteImport', () => {
  it('accepts a well-formed palette', () => {
    const input = { light: { 'surface-app': '#ff0000' }, dark: { 'surface-app': '#000000' } };
    expect(validatePaletteImport(input)).toEqual(input);
  });

  it('defaults missing light/dark keys to empty objects', () => {
    expect(validatePaletteImport({})).toEqual({ light: {}, dark: {} });
  });

  it('drops keys that are not known palette tokens', () => {
    const input = { light: { 'surface-app': '#ff0000', 'not-a-real-token': '#123456' }, dark: {} };
    expect(validatePaletteImport(input)).toEqual({ light: { 'surface-app': '#ff0000' }, dark: {} });
  });

  it('drops values that are not strings', () => {
    const input = { light: { 'surface-app': 12345 }, dark: {} };
    expect(validatePaletteImport(input)).toEqual({ light: {}, dark: {} });
  });

  it('drops string values that are not a real color, like a named color', () => {
    const input = { light: { 'surface-app': 'blue' }, dark: { 'surface-app': 'not-a-color' } };
    expect(validatePaletteImport(input)).toEqual({ light: {}, dark: {} });
  });

  it('accepts a 6-digit hex color', () => {
    const input = { light: { 'surface-app': '#ff0000' }, dark: {} };
    expect(validatePaletteImport(input)).toEqual({ light: { 'surface-app': '#ff0000' }, dark: {} });
  });

  it('accepts an rgba() color in the exact format withAlpha produces', () => {
    const input = { light: { 'surface-app': 'rgba(255, 0, 0, 0.5)' }, dark: {} };
    expect(validatePaletteImport(input)).toEqual({ light: { 'surface-app': 'rgba(255, 0, 0, 0.5)' }, dark: {} });
  });

  it('ignores a non-object light/dark value instead of throwing', () => {
    const input = { light: 'not an object', dark: null };
    expect(validatePaletteImport(input)).toEqual({ light: {}, dark: {} });
  });

  it('throws when the root is not an object', () => {
    expect(() => validatePaletteImport('a string')).toThrow('Palette file must be a JSON object.');
    expect(() => validatePaletteImport(null)).toThrow('Palette file must be a JSON object.');
    expect(() => validatePaletteImport([1, 2, 3])).not.toThrow(); // arrays are objects; light/dark just come back empty
  });

  it('accepts ramp tokens with a valid hex value', () => {
    const input = { light: { 'ramp-accent': '#ff0000', 'ramp-ink': '#000000' }, dark: {} };
    expect(validatePaletteImport(input)).toEqual(input);
  });

  it('drops surface-accent and surface-accent-soft now that they are no longer known tokens', () => {
    const input = { light: { 'surface-accent': '#ff0000', 'surface-app': '#123456' }, dark: {} };
    expect(validatePaletteImport(input)).toEqual({ light: { 'surface-app': '#123456' }, dark: {} });
  });
});
