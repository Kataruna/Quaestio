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

  it('ignores a non-object light/dark value instead of throwing', () => {
    const input = { light: 'not an object', dark: null };
    expect(validatePaletteImport(input)).toEqual({ light: {}, dark: {} });
  });

  it('throws when the root is not an object', () => {
    expect(() => validatePaletteImport('a string')).toThrow('Palette file must be a JSON object.');
    expect(() => validatePaletteImport(null)).toThrow('Palette file must be a JSON object.');
    expect(() => validatePaletteImport([1, 2, 3])).not.toThrow(); // arrays are objects; light/dark just come back empty
  });
});
