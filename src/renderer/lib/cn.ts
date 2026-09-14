import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// tailwind-merge ships knowledge of Tailwind's *default* theme only. This
// project's custom color and font-size scales (src/renderer/styles/tokens.css)
// are invisible to it, so it falls back to guessing conflict groups from the
// class name shape — and a custom `text-*` font-size name (e.g. `text-label`,
// from `--text-label`) gets misread as conflicting with a `text-*` color name
// (e.g. `text-white`), silently dropping the earlier one. That's what made
// every <Button> render with no text color: `cn(VARIANTS[variant], SIZES[size])`
// put `text-white` before `text-label`/`text-body`, and twMerge deleted it
// believing they were the same "text color" utility.
const merge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        'lime-100',
        'lime-200',
        'lime-300',
        'lime-400',
        'lime-500',
        'lime-600',
        'lime-700',
        'ink-900',
        'ink-800',
        'ink-700',
        'ink-600',
        'neutral-0',
        'neutral-25',
        'neutral-50',
        'neutral-100',
        'neutral-200',
        'neutral-300',
        'neutral-400',
        'neutral-500',
        'neutral-600',
        'neutral-700',
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
        'surface-app',
        'surface-card',
        'surface-sunken',
        'surface-ink',
        'surface-accent',
        'surface-accent-soft',
        'text-strong',
        'text-body',
        'text-muted',
        'text-faint',
        'line-hairline',
        'line-strong',
      ],
      text: [
        'nano',
        'micro',
        'label',
        'body-s',
        'body',
        'title-s',
        'title-m',
        'title-l',
        'page',
        'stat',
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}
