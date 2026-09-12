import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SignInScreen({
  onUseToken,
  onUseDeviceFlow,
  error,
  busy = false,
}: {
  onUseToken: (token: string) => void;
  onUseDeviceFlow: () => void;
  error?: string;
  busy?: boolean;
}) {
  const [token, setToken] = useState('');

  return (
    <div className="flex flex-1 items-center justify-center px-10">
      <div className="w-[420px] rounded-card bg-surface-card p-7 shadow-floating">
        <h1 className="font-display text-title-l font-semibold tracking-[-0.02em] text-text-strong">
          Sign in to GitHub
        </h1>
        <p className="mb-6 mt-1.5 font-sans text-body text-text-muted">
          Issue Desk needs access to read and write the issues in your repositories.
        </p>

        <Button variant="primary" className="w-full" onClick={onUseDeviceFlow} disabled={busy}>
          Continue with GitHub
        </Button>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-line-hairline" />
          <span className="font-sans text-micro text-text-faint">or use a token</span>
          <span className="h-px flex-1 bg-line-hairline" />
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (token.trim()) onUseToken(token.trim());
          }}
        >
          <Input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Personal access token"
            aria-label="Personal access token"
            autoComplete="off"
          />
          <Button
            type="submit"
            variant="secondary"
            className="mt-3 w-full"
            disabled={busy || token.trim().length === 0}
          >
            {busy ? 'Checking…' : 'Sign in with token'}
          </Button>
        </form>

        {error ? (
          <p className="mt-3 font-sans text-micro text-status-hot" role="alert">
            {error}
          </p>
        ) : null}

        <p className="mt-5 font-sans text-micro text-text-faint">
          Needs the repo and read:user scopes. The token is stored encrypted on this machine and
          never leaves it.
        </p>
      </div>
    </div>
  );
}
