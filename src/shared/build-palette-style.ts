import type { PaletteOverrides } from './palette-tokens';

function declarations(overrides: Partial<Record<string, string>>): string {
  return Object.entries(overrides)
    .map(([token, value]) => `--color-${token}:${value};`)
    .join('');
}

/**
 * Turns persisted overrides into the text content of a single <style> tag.
 * Composes with tokens.css's own `@media (prefers-color-scheme: dark)`
 * block exactly the same way the built-in dark palette does — this is just
 * one more layer, injected after Tailwind's stylesheet in the DOM so it
 * wins the cascade for the same custom properties without `!important`.
 */
export function buildPaletteStyleTag(overrides: PaletteOverrides): string {
  const lightDecls = declarations(overrides.light);
  const darkDecls = declarations(overrides.dark);
  let css = '';
  if (lightDecls) css += `:root{${lightDecls}}`;
  if (darkDecls) css += `@media (prefers-color-scheme: dark){:root{${darkDecls}}}`;
  return css;
}
