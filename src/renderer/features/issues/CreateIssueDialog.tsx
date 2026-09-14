import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Issue } from '@shared/types';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/components/ui/toast';

export function CreateIssueDialog({
  open,
  repoFullName,
  online,
  onClose,
}: {
  open: boolean;
  repoFullName: string;
  online: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const createMutation = useMutation({
    mutationFn: () => window.api.issues.create({ repoFullName, title: title.trim(), body: body.trim() || undefined }),
    onSuccess: (issue: Issue) => {
      void queryClient.invalidateQueries({ queryKey: ['issues', repoFullName] });
      setTitle('');
      setBody('');
      onClose();
      showToast(`Created #${issue.number}`, 'success');
    },
    onError: (error: unknown) => {
      showToast(`Failed to create issue: ${error instanceof Error ? error.message : 'unknown error'}`, 'error');
    },
  });

  const disabled = !online || createMutation.isPending;

  function submit() {
    if (!title.trim()) return;
    createMutation.mutate();
  }

  return (
    <Dialog open={open} onClose={onClose} className="w-[520px] gap-3 p-6">
      <h2 className="font-display text-title-s font-semibold text-text-strong">New issue</h2>
      {!online ? (
        <p className="rounded-[10px] bg-status-hot-bg px-3 py-2 font-sans text-micro font-medium text-status-hot">
          Writes are disabled while offline.
        </p>
      ) : null}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Title"
        disabled={disabled}
        autoFocus
      />
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Description (optional)"
        rows={5}
        disabled={disabled}
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" onClick={submit} disabled={disabled || !title.trim()}>
          Create
        </Button>
      </div>
    </Dialog>
  );
}
