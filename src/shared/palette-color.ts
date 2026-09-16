/** Every override this app ever stores is one of these two shapes. */
const RGBA_PATTERN = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/;

function toHexByte(n: number): string {
  return n.toString(16).padStart(2, '0');
}

/**
 * Reduces any color string this app produces (plain hex, or the rgba()
 * strings withAlpha below generates) to its hue and alpha, so the color
 * picker — which only ever edits hue — can show the right swatch and
 * withAlpha can restore the original transparency after an edit.
 */
export function parseColor(value: string): { hex: string; alpha: number } {
  const rgbaMatch = RGBA_PATTERN.exec(value);
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch;
    return {
      hex: `#${toHexByte(Number(r))}${toHexByte(Number(g))}${toHexByte(Number(b))}`,
      alpha: Number(a),
    };
  }
  return { hex: value, alpha: 1 };
}

/**
 * Inverse of parseColor's hex half: combines a freshly-picked opaque hex
 * with a (usually pre-existing) alpha. Alpha is never something the user
 * picks directly — it always comes from whatever the token's current
 * effective value already had (see ColorCustomizationScreen).
 */
export function withAlpha(hex: string, alpha: number): string {
  if (alpha >= 1) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
