import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import type { Theme } from '@shared/ipc-contract';
import { Button } from '@/components/ui/button';
import { SelectPill } from '@/components/ui/select-pill';
import { Switch } from '@/components/ui/switch';
import { showToast } from '@/components/ui/toast';
import { ColorCustomizationScreen } from './ColorCustomizationScreen';

const INTERVAL_OPTIONS = ['Every 5 min', 'Every 15 min', 'Hourly', 'Manual only'] as const;

const THEME_OPTIONS = ['Light', 'Dark', 'System'] as const;
type ThemeOptionLabel = (typeof THEME_OPTIONS)[number];
const THEME_LABEL: Record<Theme, ThemeOptionLabel> = { light: 'Light', dark: 'Dark', system: 'System' };
const THEME_FROM_LABEL: Record<ThemeOptionLabel, Theme> = { Light: 'light', Dark: 'dark', System: 'system' };

interface Row {
  id: string;
  title: string;
  detail: string;
}

const TOGGLE_ROWS: Row[] = [
  {
    id: 'pushSubtasks',
    title: 'Push subtask progress as a comment',
    detail: 'Subtasks are local by default',
  },
  {
    id: 'mapLabels',
    title: 'Use GitHub Issue Type',
    detail: "Bug/Feature/Task comes from GitHub's Issue Type field, not labels",
  },
  {
    id: 'notifyP1',
    title: 'Notify on new P1',
    detail: 'Desktop notification when a P1 lands in a tracked repo',
  },
];

export function SettingsScreen() {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    pushSubtasks: false,
    mapLabels: true,
    notifyP1: true,
  });
  const [showColorPage, setShowColorPage] = useState(false);

  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: () => window.api.settings.get() });
  const tabGroupsEnabled = settingsQuery.data?.tabGroupsEnabled ?? false;
  const theme = settingsQuery.data?.theme ?? 'system';
  const setTabGroupsMutation = useMutation({
    mutationFn: (enabled: boolean) => window.api.settings.setTabGroupsEnabled({ enabled }),
    onSuccess: (_data, enabled) => {
      queryClient.setQueryData(['settings'], (current: { tabGroupsEnabled: boolean; theme: Theme } | undefined) => ({
        tabGroupsEnabled: enabled,
        theme: current?.theme ?? 'system',
      }));
    },
    onError: (error) => {
      showToast(`Failed to save setting: ${error instanceof Error ? error.message : 'unknown error'}`, 'error');
    },
  });
  const setThemeMutation = useMutation({
    mutationFn: (next: Theme) => window.api.settings.setTheme({ theme: next }),
    onSuccess: (_data, next) => {
      queryClient.setQueryData(['settings'], (current: { tabGroupsEnabled: boolean; theme: Theme } | undefined) => ({
        tabGroupsEnabled: current?.tabGroupsEnabled ?? false,
        theme: next,
      }));
    },
    onError: (error) => {
      showToast(`Failed to save setting: ${error instanceof Error ? error.message : 'unknown error'}`, 'error');
    },
  });

  if (showColorPage) {
    return <ColorCustomizationScreen onBack={() => setShowColorPage(false)} />;
  }

  return (
    <div className="max-w-[560px] rounded-card bg-surface-card p-6 shadow-card">
      <h1 className="mb-1 font-display text-title-m font-semibold tracking-[-0.02em] text-text-strong">
        Sync
      </h1>
      <p className="mb-[18px] font-sans text-micro text-text-muted">
        Last pull 2 min ago · 4 repos · 40 issues
      </p>

      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-3.5 border-b border-line-hairline py-3.5">
          <span className="flex flex-col gap-0.5">
            <span className="font-sans text-label font-medium text-text-strong">Appearance</span>
            <span className="font-sans text-micro text-text-muted">Light, dark, or match the system</span>
          </span>
          <span className="ml-auto flex items-center gap-2">
            <SelectPill
              options={THEME_OPTIONS}
              aria-label="Appearance"
              value={THEME_LABEL[theme]}
              onChange={(event) => setThemeMutation.mutate(THEME_FROM_LABEL[event.target.value as ThemeOptionLabel])}
            />
            <Button variant="ghost" size="sm" onClick={() => setShowColorPage(true)}>
              Customize colors
            </Button>
          </span>
        </div>

        <div className="flex items-center gap-3.5 border-b border-line-hairline py-3.5">
          <span className="flex flex-col gap-0.5">
            <span className="font-sans text-label font-medium text-text-strong">Pull interval</span>
            <span className="font-sans text-micro text-text-muted">
              How often Quaestio checks GitHub for changes
            </span>
          </span>
          <SelectPill className="ml-auto" options={INTERVAL_OPTIONS} aria-label="Pull interval" />
        </div>

        <div className="flex items-center gap-3.5 border-b border-line-hairline py-3.5">
          <span className="flex flex-col gap-0.5">
            <span className="font-sans text-label font-medium text-text-strong">Group tabs by owner</span>
            <span className="font-sans text-micro text-text-muted">
              Drag tabs to rearrange or group them, Opera-Islands style. Off by default.
            </span>
          </span>
          <span className="ml-auto">
            <Switch
              label="Group tabs by owner"
              checked={tabGroupsEnabled}
              onCheckedChange={(next) => setTabGroupsMutation.mutate(next)}
            />
          </span>
        </div>

        {TOGGLE_ROWS.map((row, index) => (
          <div
            key={row.id}
            className={
              index === TOGGLE_ROWS.length - 1
                ? 'flex items-center gap-3.5 py-3.5'
                : 'flex items-center gap-3.5 border-b border-line-hairline py-3.5'
            }
          >
            <span className="flex flex-col gap-0.5">
              <span className="font-sans text-label font-medium text-text-strong">{row.title}</span>
              <span className="font-sans text-micro text-text-muted">{row.detail}</span>
            </span>
            <span className="ml-auto">
              <Switch
                label={row.title}
                checked={toggles[row.id] ?? false}
                onCheckedChange={(next) =>
                  setToggles((current) => ({ ...current, [row.id]: next }))
                }
              />
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-2.5 rounded-[18px] bg-surface-sunken px-4 py-3.5">
        <span className="h-[7px] w-[7px] rounded-pill bg-status-won" />
        <span className="font-sans text-micro text-text-muted">All four repos synced cleanly</span>
        <Button variant="secondary" size="sm" iconLeft={RefreshCw} className="ml-auto">
          Sync now
        </Button>
      </div>
    </div>
  );
}
