import { RAMP_TOKENS, type RampToken } from './ramp-tokens';

export const PALETTE_TOKENS = [
  'surface-app',
  'surface-card',
  'surface-sunken',
  'surface-ink',
  'surface-overlay',
  'surface-chip',
  'text-strong',
  'text-body',
  'text-muted',
  'text-faint',
  'line-hairline',
  'line-strong',
  'status-hot',
  'status-hot-bg',
  'status-warm',
  'status-warm-bg',
  'status-due',
  'status-due-bg',
  'status-won',
  'status-won-bg',
  'status-info',
  'status-info-bg',
] as const;

export type PaletteToken = (typeof PALETTE_TOKENS)[number];
export type PaletteMode = 'light' | 'dark';
export type AnyPaletteToken = PaletteToken | RampToken;
export const ALL_TOKENS: readonly AnyPaletteToken[] = [...PALETTE_TOKENS, ...RAMP_TOKENS];
export type PaletteOverrides = {
  light: Partial<Record<AnyPaletteToken, string>>;
  dark: Partial<Record<AnyPaletteToken, string>>;
};

export const PALETTE_GROUPS: { label: string; tokens: PaletteToken[] }[] = [
  {
    label: 'Surfaces',
    tokens: ['surface-app', 'surface-card', 'surface-sunken', 'surface-ink', 'surface-overlay', 'surface-chip'],
  },
  { label: 'Text', tokens: ['text-strong', 'text-body', 'text-muted', 'text-faint'] },
  { label: 'Lines', tokens: ['line-hairline', 'line-strong'] },
  {
    label: 'Status',
    tokens: [
      'status-hot',
      'status-hot-bg',
      'status-warm',
      'status-warm-bg',
      'status-due',
      'status-due-bg',
      'status-won',
      'status-won-bg',
      'status-info',
      'status-info-bg',
    ],
  },
];

export const PALETTE_DEFAULTS: Record<PaletteMode, Record<PaletteToken, string>> = {
  light: {
    'surface-app': '#f4f4f1',
    'surface-card': '#ffffff',
    'surface-sunken': '#eeeeea',
    'surface-ink': '#0e0f10',
    'surface-overlay': 'rgba(14, 15, 16, 0.55)',
    'surface-chip': '#ffffff',
    'text-strong': '#16181a',
    'text-body': '#232629',
    'text-muted': '#6e7174',
    'text-faint': '#b4b5ae',
    'line-hairline': '#e4e4de',
    'line-strong': '#d6d6cf',
    'status-hot': '#f0433a',
    'status-hot-bg': '#fde4e2',
    'status-warm': '#fb8c3a',
    'status-warm-bg': '#feebda',
    'status-due': '#f5c93b',
    'status-due-bg': '#fdf2d6',
    'status-won': '#59c24c',
    'status-won-bg': '#e1f5de',
    'status-info': '#3d7bf7',
    'status-info-bg': '#e0eafe',
  },
  dark: {
    'surface-app': '#0b0c0b',
    'surface-card': '#181a17',
    'surface-sunken': '#1f211d',
    'surface-ink': '#272a25',
    'surface-overlay': 'rgba(5, 6, 5, 0.66)',
    'surface-chip': '#1f211d',
    'text-strong': '#f4f5f0',
    'text-body': '#dddfd7',
    'text-muted': '#9da096',
    'text-faint': '#6f736a',
    'line-hairline': 'rgba(255, 255, 255, 0.1)',
    'line-strong': 'rgba(255, 255, 255, 0.18)',
    'status-hot': '#ff6b62',
    'status-hot-bg': 'rgba(255, 107, 98, 0.16)',
    'status-warm': '#ffa45c',
    'status-warm-bg': 'rgba(255, 164, 92, 0.16)',
    'status-due': '#ffd760',
    'status-due-bg': 'rgba(255, 215, 96, 0.16)',
    'status-won': '#7bda6c',
    'status-won-bg': 'rgba(123, 218, 108, 0.16)',
    'status-info': '#6e9bff',
    'status-info-bg': 'rgba(110, 155, 255, 0.16)',
  },
};
