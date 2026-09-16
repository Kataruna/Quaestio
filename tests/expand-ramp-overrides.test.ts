import { describe, expect, it } from 'vitest';
import { expandRampOverrides } from '../src/shared/expand-ramp-overrides';

describe('expandRampOverrides', () => {
  it('passes through an overrides map with no ramp entries unchanged', () => {
    const overrides = { light: { 'surface-app': '#ff0000' }, dark: {} };
    expect(expandRampOverrides(overrides)).toEqual(overrides);
  });

  it('expands a ramp entry into its full shade set', () => {
    const overrides = { light: { 'ramp-accent': '#ff0000' }, dark: {} };
    const result = expandRampOverrides(overrides);
    expect(Object.keys(result.light).sort()).toEqual([
      'lime-100',
      'lime-200',
      'lime-300',
      'lime-400',
      'lime-500',
      'lime-600',
      'lime-700',
    ]);
    expect(result.light['lime-400']).toBe('#ff0000');
    expect(result.dark).toEqual({});
  });

  it('preserves semantic-token entries alongside an expanded ramp entry', () => {
    const overrides = { light: { 'ramp-accent': '#ff0000', 'surface-app': '#123456' }, dark: {} };
    const result = expandRampOverrides(overrides);
    expect(result.light['surface-app']).toBe('#123456');
    expect(result.light['lime-400']).toBe('#ff0000');
  });

  it('expands ramp entries independently per mode', () => {
    const overrides = {
      light: { 'ramp-ink': '#0e0f10' },
      dark: { 'ramp-ink': '#ffffff' },
    };
    const result = expandRampOverrides(overrides);
    expect(result.light['ink-900']).toBe('#0e0f10');
    expect(result.dark['ink-900']).toBe('#ffffff');
  });
});
