import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { quickTransition } from '@/lib/motion';

type ToastTone = 'error' | 'success';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

// Module-level store, not React context — `showToast` needs to be callable
// from plain event handlers anywhere (mutation `onError`/`onSuccess`
// callbacks) without every caller needing a hook or a provider prop drilled
// down to it. `<ToastHost>` (mounted once, near the app root) is the only
// thing that subscribes.
let items: ToastItem[] = [];
let nextId = 0;
let listeners: Array<(items: ToastItem[]) => void> = [];

function emit(): void {
  for (const listener of listeners) listener(items);
}

const AUTO_DISMISS_MS = 5000;

export function showToast(message: string, tone: ToastTone = 'error'): void {
  const id = nextId++;
  items = [...items, { id, message, tone }];
  emit();
  setTimeout(() => {
    items = items.filter((item) => item.id !== id);
    emit();
  }, AUTO_DISMISS_MS);
}

export function ToastHost() {
  const [current, setCurrent] = useState<ToastItem[]>(items);

  useEffect(() => {
    listeners.push(setCurrent);
    return () => {
      listeners = listeners.filter((listener) => listener !== setCurrent);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2"
    >
      <AnimatePresence>
        {current.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={quickTransition}
            className={cn(
              'pointer-events-auto rounded-pill px-4 py-2 font-sans text-label font-medium text-white shadow-card',
              item.tone === 'error' ? 'bg-status-hot' : 'bg-ink-900',
            )}
          >
            {item.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
