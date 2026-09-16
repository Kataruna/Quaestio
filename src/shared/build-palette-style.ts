import type { PaletteOverrides } from './palette-tokens';

function declarations(overrides: Partial<Record<string, string>>): string {
  return Object.entries(overrides)
    .map(([token, value]) => `--color-${token}:${value};`)
    .join('');
}

/**
 * Turns persisted overrides into the text content of a single <style> tag.
 * Both light and dark overrides are wrapped in their respective `@media (prefers-color-scheme: ...)` queries.
 * This prevents cascade-order bugs: the injected <style> tag comes after tokens.css in the DOM, so an
 * unwrapped light override would incorrectly leak into dark mode (media queries of equal specificity are
 * tiebroken by source order, and "always applies" beats "applies when dark").
 */
export function buildPaletteStyleTag(overrides: PaletteOverrides): string {
  const lightDecls = declarations(overrides.light);
  const darkDecls = declarations(overrides.dark);
  let css = '';
  if (lightDecls) css += `@media (prefers-color-scheme: light){:root{${lightDecls}}}`;
  if (darkDecls) css += `@media (prefers-color-scheme: dark){:root{${darkDecls}}}`;
  return css;
}
