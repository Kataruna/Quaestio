import { Button } from '@/components/ui/button';

export function DeviceCodeScreen({
  userCode,
  verificationUri,
  onCancel,
}: {
  userCode: string;
  verificationUri: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-10">
      <div className="w-[420px] rounded-card bg-surface-card p-7 text-center shadow-floating">
        <h1 className="font-display text-title-l font-semibold tracking-[-0.02em] text-text-strong">
          Enter this code on GitHub
        </h1>
        <p className="mb-6 mt-1.5 font-sans text-body text-text-muted">
          Your browser is opening {verificationUri}. Type the code below to finish signing in.
        </p>

        <div className="rounded-tile bg-surface-sunken px-5 py-4">
          <span className="select-text font-mono text-[28px] font-medium tracking-[0.12em] text-text-strong">
            {userCode}
          </span>
        </div>

        <p className="mt-4 font-sans text-micro text-text-faint">
          Waiting for you to authorise. This screen closes itself.
        </p>

        <Button variant="ghost" className="mt-5 w-full" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
