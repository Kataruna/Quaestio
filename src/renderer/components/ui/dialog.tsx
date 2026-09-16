import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { scaleFade, quickTransition } from '@/lib/motion';

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
    // Closing is deferred to the exit animation's onExitComplete below —
    // calling close() here would cut the scale/fade-out short.
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Sizing and padding from `className` go on the inner content wrapper,
      // never here: padding applied to the <dialog> itself sits inside its
      // own border box, which would make it visually overlap the card.
      //
      // No background/shadow here anymore — the card look now lives on the
      // content wrapper below, so it can fade/scale independently of the
      // backdrop. `backdrop:bg-transparent` neutralizes the native
      // ::backdrop pseudo-element (which snaps instantly with the `open`
      // attribute and can't be animated by React) in favor of the real,
      // animatable backdrop div rendered inside.
      //
      // `fixed inset-0 m-auto` explicitly centers the dialog rather than relying
      // on the browser's default UA centering for <dialog> (auto margins within
      // the native top layer) — Tailwind's preflight reset zeroes margins
      // broadly, which strips that default with nothing to replace it, leaving
      // the dialog pinned to the top-left corner instead of centered.
      className="fixed inset-0 m-auto bg-transparent p-0 backdrop:bg-transparent open:flex open:flex-col"
    >
      <AnimatePresence onExitComplete={() => ref.current?.close()}>
        {open ? (
          <motion.div
            key="dialog-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={quickTransition}
            onClick={onClose}
            className="fixed inset-0 bg-surface-overlay"
          />
        ) : null}
        {open ? (
          <motion.div
            key="dialog-content"
            variants={scaleFade}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={quickTransition}
            // `relative` puts this in the same painted-after-backdrop bucket
            // as the fixed backdrop above (positioned descendants paint in
            // DOM order) — without it, being a plain in-flow box, it would
            // paint *before* the backdrop and end up hidden behind it.
            className={cn('relative flex flex-col rounded-card bg-surface-card shadow-modal', className)}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </dialog>
  );
}
