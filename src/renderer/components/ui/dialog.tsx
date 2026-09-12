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
      className={cn(
        'rounded-card bg-surface-card p-0 shadow-modal backdrop:bg-ink-900/55',
        'open:flex open:flex-col',
        className,
      )}
    >
      {open ? children : null}
    </dialog>
  );
}
