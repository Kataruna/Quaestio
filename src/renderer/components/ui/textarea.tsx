import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-[18px] border border-line-hairline bg-surface-card px-4 py-3',
        'font-sans text-body-s text-text-strong placeholder:text-text-faint',
        'select-text transition-colors duration-[140ms] ease-[var(--ease-standard)]',
        'focus:border-lime-500 focus:outline-none',
        className,
      )}
      {...props}
    />
  );
}
