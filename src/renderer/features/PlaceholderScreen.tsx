export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <div className="font-display text-title-m font-semibold tracking-[-0.02em] text-text-strong">
        {title}
      </div>
      <p className="max-w-[320px] font-sans text-body text-text-muted">
        Not designed yet. This destination is in the rail but has no screen in the handoff.
      </p>
    </div>
  );
}
