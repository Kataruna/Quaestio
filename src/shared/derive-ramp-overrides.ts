import { hexToHsl, hslToHex } from './hsl-color';
import { RAMP_SHADE_DEFAULTS, RAMP_ANCHOR_SHADE, RAMP_FAMILY, type RampToken } from './ramp-tokens';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Derives every shade in a ramp from one picked anchor color. Preserves the
 * ramp's original lightness progression (each shade's default lightness
 * relative to the anchor's default lightness), applied to the picked color's
 * hue and saturation, which are held constant across every derived shade —
 * see the design spec's "Shade derivation algorithm" for why.
 */
export function deriveRampOverrides(ramp: RampToken, anchorHex: string): Record<string, string> {
  const defaults = RAMP_SHADE_DEFAULTS[ramp];
  const anchorShade = RAMP_ANCHOR_SHADE[ramp];
  const anchorDefaultHsl = hexToHsl(defaults[anchorShade]!);
  const pickedHsl = hexToHsl(anchorHex);
  const family = RAMP_FAMILY[ramp];
  const result: Record<string, string> = {};
  for (const [shade, defaultHex] of Object.entries(defaults)) {
    const shadeHsl = hexToHsl(defaultHex);
    const deltaL = shadeHsl.l - anchorDefaultHsl.l;
    const newL = clamp(pickedHsl.l + deltaL, 0, 100);
    result[`${family}-${shade}`] = hslToHex({ h: pickedHsl.h, s: pickedHsl.s, l: newL });
  }
  return result;
}
