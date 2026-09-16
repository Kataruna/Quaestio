import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Upload, RotateCcw } from 'lucide-react';
import { PALETTE_GROUPS, PALETTE_DEFAULTS, type PaletteMode, type PaletteToken } from '@shared/palette-tokens';
import type { PaletteOverrides } from '@shared/palette-tokens';
import { parseColor, withAlpha } from '@shared/palette-color';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast';

const MODES: PaletteMode[] = ['light', 'dark'];
const EMPTY_OVERRIDES: PaletteOverrides = { light: {}, dark: {} };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}

export function ColorCustomizationScreen({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const paletteQuery = useQuery({
    queryKey: ['customPalette'],
    queryFn: () => window.api.theme.getPaletteOverrides(),
  });
  const overrides = paletteQuery.data ?? EMPTY_OVERRIDES;

  const setOverrideMutation = useMutation({
    mutationFn: (input: { mode: PaletteMode; token: PaletteToken; value: string | null }) =>
      window.api.theme.setPaletteOverride(input),
    onSuccess: (_data, input) => {
      queryClient.setQueryData(['customPalette'], (current: PaletteOverrides | undefined) => {
        const base = current ?? EMPTY_OVERRIDES;
        const nextMode = { ...base[input.mode] };
        if (input.value === null) {
          delete nextMode[input.token];
        } else {
          nextMode[input.token] = input.value;
        }
        return { ...base, [input.mode]: nextMode };
      });
    },
    onError: (error) => showToast(`Failed to save color: ${errorMessage(error)}`, 'error'),
  });

  const resetModeMutation = useMutation({
    mutationFn: (mode: PaletteMode) => window.api.theme.resetPalette({ mode }),
    onSuccess: (_data, mode) => {
      queryClient.setQueryData(['customPalette'], (current: PaletteOverrides | undefined) => ({
        ...(current ?? EMPTY_OVERRIDES),
        [mode]: {},
      }));
    },
    onError: (error) => showToast(`Failed to reset: ${errorMessage(error)}`, 'error'),
  });

  const exportMutation = useMutation({
    mutationFn: () => window.api.theme.exportPalette(),
    onSuccess: (result) => {
      if (result) showToast(`Exported to ${result.path}`, 'success');
    },
    onError: (error) => showToast(`Export failed: ${errorMessage(error)}`, 'error'),
  });

  const importMutation = useMutation({
    mutationFn: () => window.api.theme.importPalette(),
    onSuccess: (result) => {
      if (result) {
        queryClient.setQueryData(['customPalette'], result);
        showToast('Palette imported', 'success');
      }
    },
    onError: (error) => showToast(`Couldn't import: ${errorMessage(error)}`, 'error'),
  });

  function effectiveValue(mode: PaletteMode, token: PaletteToken): string {
    return overrides[mode][token] ?? PALETTE_DEFAULTS[mode][token];
  }

  function handlePick(mode: PaletteMode, token: PaletteToken, pickedHex: string) {
    const { alpha } = parseColor(effectiveValue(mode, token));
    setOverrideMutation.mutate({ mode, token, value: withAlpha(pickedHex, alpha) });
  }

  return (
    <div className="max-w-[560px] rounded-card bg-surface-card p-6 shadow-card">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Settings"
          className="flex h-8 w-8 items-center justify-center rounded-pill text-text-muted hover:bg-surface-sunken hover:text-text-strong"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
        </button>
        <h1 className="font-display text-title-m font-semibold tracking-[-0.02em] text-text-strong">
          Customize colors
        </h1>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" iconLeft={Download} onClick={() => exportMutation.mutate()}>
            Export
          </Button>
          <Button variant="secondary" size="sm" iconLeft={Upload} onClick={() => importMutation.mutate()}>
            Import
          </Button>
        </div>
      </div>

      {MODES.map((mode) => (
        <div key={mode} className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="font-sans text-label font-medium capitalize text-text-strong">{mode}</h2>
            <Button
              variant="ghost"
              size="sm"
              iconLeft={RotateCcw}
              className="ml-auto"
              onClick={() => resetModeMutation.mutate(mode)}
            >
              Reset all
            </Button>
          </div>
          {PALETTE_GROUPS.map((group) => (
            <div key={group.label} className="mb-3">
              <span className="mb-1 block font-sans text-micro text-text-muted">{group.label}</span>
              <div className="flex flex-col gap-1">
                {group.tokens.map((token) => {
                  const value = effectiveValue(mode, token);
                  const hex = parseColor(value).hex;
                  const hasOverride = overrides[mode][token] !== undefined;
                  return (
                    <div key={token} className="flex items-center gap-2.5 py-1">
                      <span className="flex-1 font-sans text-label text-text-body">{token}</span>
                      <input
                        // Keyed on the committed hex so the DOM node remounts (picking up a
                        // fresh `defaultValue`) whenever the effective value changes from
                        // outside this input's own drag — a reset, an import, or this row's
                        // own commit landing in the query cache. Uncontrolled otherwise, so
                        // the OS color panel can update the swatch live while dragging
                        // without React fighting it on every tick.
                        key={hex}
                        type="color"
                        aria-label={`${mode} ${token}`}
                        defaultValue={hex}
                        ref={(node) => {
                          if (!node) return;
                          const onCommit = (event: Event) => {
                            handlePick(mode, token, (event.target as HTMLInputElement).value);
                          };
                          // Native `change` fires once, on commit — not React's `onChange`
                          // prop, which for a color input maps to the native `input` event
                          // and would fire continuously while dragging in the OS picker.
                          node.addEventListener('change', onCommit);
                          return () => node.removeEventListener('change', onCommit);
                        }}
                        className="h-7 w-10 cursor-pointer rounded-xs border border-line-hairline bg-transparent p-0"
                      />
                      {hasOverride ? (
                        <button
                          type="button"
                          aria-label={`Reset ${token} to default`}
                          onClick={() => setOverrideMutation.mutate({ mode, token, value: null })}
                          className="text-text-muted hover:text-text-strong"
                        >
                          <RotateCcw size={12} strokeWidth={1.75} />
                        </button>
                      ) : (
                        <span className="w-3" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
