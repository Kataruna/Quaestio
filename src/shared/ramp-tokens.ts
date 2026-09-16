export const RAMP_TOKENS = ['ramp-accent', 'ramp-ink', 'ramp-neutral'] as const;
export type RampToken = (typeof RAMP_TOKENS)[number];

/** UI label shown for each ramp's picker row. */
export const RAMP_LABELS: Record<RampToken, string> = {
  'ramp-accent': 'Accent',
  'ramp-ink': 'Ink',
  'ramp-neutral': 'Neutral',
};

/** The real CSS variable family each ramp token controls, e.g. ramp-accent -> --color-lime-100..700. */
export const RAMP_FAMILY: Record<RampToken, string> = {
  'ramp-accent': 'lime',
  'ramp-ink': 'ink',
  'ramp-neutral': 'neutral',
};

/** The shade each ramp's default table is centered on — the one real components use most (see design spec). */
export const RAMP_ANCHOR_SHADE: Record<RampToken, number> = {
  'ramp-accent': 400,
  'ramp-ink': 900,
  'ramp-neutral': 400,
};

/** Every shade in each ramp, with its default hex — from tokens.css's raw ramp declarations. */
export const RAMP_SHADE_DEFAULTS: Record<RampToken, Record<number, string>> = {
  'ramp-accent': {
    100: '#f1fbd9',
    200: '#e2f8ac',
    300: '#d4f57d',
    400: '#c7f24c',
    500: '#b6e230',
    600: '#9cc81c',
    700: '#6e8f14',
  },
  'ramp-ink': {
    600: '#3a3e42',
    700: '#232629',
    800: '#16181a',
    900: '#0e0f10',
  },
  'ramp-neutral': {
    0: '#ffffff',
    25: '#fbfbf9',
    50: '#f4f4f1',
    100: '#eeeeea',
    200: '#e4e4de',
    300: '#d6d6cf',
    400: '#b4b5ae',
    500: '#8a8d8f',
    600: '#6e7174',
    700: '#4a4d50',
  },
};

/** The anchor shade's own default hex — shown as the picker's un-overridden value. */
export const RAMP_ANCHOR_DEFAULTS: Record<RampToken, string> = {
  'ramp-accent': RAMP_SHADE_DEFAULTS['ramp-accent'][RAMP_ANCHOR_SHADE['ramp-accent']]!,
  'ramp-ink': RAMP_SHADE_DEFAULTS['ramp-ink'][RAMP_ANCHOR_SHADE['ramp-ink']]!,
  'ramp-neutral': RAMP_SHADE_DEFAULTS['ramp-neutral'][RAMP_ANCHOR_SHADE['ramp-neutral']]!,
};
