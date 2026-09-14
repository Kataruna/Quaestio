import { describe, expect, it } from 'vitest';
import { cn } from '../src/renderer/lib/cn';

describe('cn', () => {
  it('keeps a custom text-color class alongside a custom text-size class', () => {
    // Regression test: tailwind-merge doesn't know this project's custom
    // `--text-*` font-size scale (nano/micro/label/body/...), so `text-label`
    // used to get misread as conflicting with `text-white` and silently
    // deleted it — every <Button> rendered with no visible text color.
    expect(cn('bg-ink-900 text-white', 'h-[34px] px-4 text-label')).toContain('text-white');
    expect(cn('bg-ink-900 text-white', 'h-10 px-5 text-body')).toContain('text-white');
    expect(cn('text-text-strong', 'text-body')).toContain('text-text-strong');
  });

  it('still lets a later custom color win a real conflict', () => {
    expect(cn('text-white', 'text-ink-900')).toBe('text-ink-900');
  });

  it('still lets a later custom text-size win a real conflict', () => {
    expect(cn('text-label', 'text-body')).toBe('text-body');
  });
});
