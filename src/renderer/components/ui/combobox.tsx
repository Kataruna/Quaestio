import { useLayoutEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { Input } from './input';
import { cn } from '@/lib/cn';

interface ComboboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'onSelect'> {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  /** Fired (in addition to `onChange`) when a suggestion is clicked — lets
   * the caller commit immediately, the way picking a value from a native
   * select does, rather than waiting for a separate blur/Enter. */
  onSelect?: (value: string) => void;
}

/**
 * A styled replacement for `<input list>` + `<datalist>` — the browser
 * renders `<datalist>` as a native, unstyleable OS popup with no way to
 * match the app's own dropdown look, so this renders the suggestion list
 * itself instead.
 *
 * ponytail: no arrow-key highlight or ARIA combobox roving-focus — click or
 * Enter/Tab-to-commit covers this app's actual usage (a handful of labels or
 * collaborators). Add proper combobox a11y if that stops being enough.
 */
export function Combobox({ value, onChange, options, onSelect, className, ...props }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const needle = value.trim().toLowerCase();
  const matches = options
    .filter((option) => option.toLowerCase().includes(needle) && option !== value)
    .slice(0, 8);

  // `absolute` was clipped by the dialog body's `overflow-y-auto` ancestor
  // whenever the field sat near the container's edge. `fixed` + a measured
  // rect escapes that clip (fixed elements aren't bounded by an ancestor's
  // overflow); reposition on scroll/resize since fixed coords are viewport-
  // relative, not anchored to the input. Capture phase because scroll events
  // don't bubble to window otherwise.
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const box = wrapperRef.current?.getBoundingClientRect();
      if (box) setPos({ top: box.bottom + 4, left: box.left });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapperRef}>
      <Input
        {...props}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={(e) => {
          setOpen(true);
          props.onFocus?.(e);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter') setOpen(false);
          props.onKeyDown?.(e);
        }}
        onBlur={(e) => {
          setOpen(false);
          props.onBlur?.(e);
        }}
        className={className}
      />
      {open && matches.length > 0 ? (
        <ul
          style={{ top: pos.top, left: pos.left }}
          className={cn(
            'fixed z-20 max-h-48 w-56 overflow-auto rounded-sm border',
            'border-line-hairline bg-surface-card py-1 shadow-floating',
          )}
        >
          {matches.map((option) => (
            <li key={option}>
              <button
                type="button"
                // Prevents the input from blurring before this click fires,
                // so an in-progress blur-to-save handler still sees the pick.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(option);
                  onSelect?.(option);
                  setOpen(false);
                }}
                className="block w-full truncate px-3 py-1.5 text-left font-sans text-micro text-text-strong hover:bg-surface-sunken"
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
