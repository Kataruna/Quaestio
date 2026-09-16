import { describe, expect, it } from 'vitest';
import { buildPaletteStyleTag } from '../src/shared/build-palette-style';

describe('buildPaletteStyleTag', () => {
  it('returns an empty string when there are no overrides', () => {
    expect(buildPaletteStyleTag({ light: {}, dark: {} })).toBe('');
  });

  it('wraps light overrides in a prefers-color-scheme: light media query', () => {
    const css = buildPaletteStyleTag({ light: { 'surface-app': '#ff0000' }, dark: {} });
    expect(css).toBe('@media (prefers-color-scheme: light){:root{--color-surface-app:#ff0000;}}');
  });

  it('wraps dark overrides in a prefers-color-scheme media query', () => {
    const css = buildPaletteStyleTag({ light: {}, dark: { 'text-strong': '#00ff00' } });
    expect(css).toBe('@media (prefers-color-scheme: dark){:root{--color-text-strong:#00ff00;}}');
  });

  it('emits both blocks when both modes have overrides', () => {
    const css = buildPaletteStyleTag({
      light: { 'surface-app': '#ff0000' },
      dark: { 'surface-app': '#0b0c0b' },
    });
    expect(css).toBe(
      '@media (prefers-color-scheme: light){:root{--color-surface-app:#ff0000;}}@media (prefers-color-scheme: dark){:root{--color-surface-app:#0b0c0b;}}',
    );
  });

  it('emits multiple tokens in one rule', () => {
    const css = buildPaletteStyleTag({
      light: { 'surface-app': '#ff0000', 'text-strong': '#000000' },
      dark: {},
    });
    expect(css).toBe('@media (prefers-color-scheme: light){:root{--color-surface-app:#ff0000;--color-text-strong:#000000;}}');
  });
});
