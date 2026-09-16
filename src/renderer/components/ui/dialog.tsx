import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Dialog({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        // Clicking the backdrop (the dialog element itself) dismisses.
        if (event.target === ref.current) onClose();
      }}
      // Sizing and padding from `className` go on the inner wrapper, never here:
      // padding applied to the <dialog> itself sits inside its own border box, so
      // clicks in that band would hit `ref.current` and be misread as backdrop
      // clicks — silently closing the modal mid-interaction.
      //
      // `fixed inset-0 m-auto` explicitly centers the dialog rather than relying
      // on the browser's default UA centering for <dialog> (auto margins within
      // the native top layer) — Tailwind's preflight reset zeroes margins
      // broadly, which strips that default with nothing to replace it, leaving
      // the dialog pinned to the top-left corner instead of centered.
      className="fixed inset-0 m-auto rounded-card bg-surface-card p-0 shadow-modal backdrop:bg-surface-overlay open:flex open:flex-col"
    >
      {open ? <div className={cn('flex flex-col', className)}>{children}</div> : null}
    </dialog>
  );
}
