"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Eye, EyeOff, Loader2, Plus, RefreshCcw, Trash2 } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchBoards, createBoardClient, updateBoardClient, deleteBoardClient } from "@/lib/client/boards";
import type { Board } from "@/lib/types/board";

const PAGE_SIZE = 20;

export default function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", isPublic: false });
  const [savingBoardId, setSavingBoardId] = useState<string | null>(null);

  const loadBoards = async (cursor?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchBoards({ limit: PAGE_SIZE, cursor });
      setBoards((prev) => (cursor ? [...prev, ...data.items] : data.items));
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load boards.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBoards();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const board = await createBoardClient({
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        isPublic: createForm.isPublic,
      });
      setBoards((prev) => [board, ...prev]);
      setCreateForm({ name: "", description: "", isPublic: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create board.");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Board>) => {
    setSavingBoardId(id);
    setError(null);
    try {
      const updated = await updateBoardClient({
        id,
        name: updates.name,
        description: updates.description,
        isPublic: updates.isPublic,
        order: updates.order,
      });
      setBoards((prev) => prev.map((board) => (board.id === id ? updated : board)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update board.");
    } finally {
      setSavingBoardId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setSavingBoardId(id);
    setError(null);
    try {
      await deleteBoardClient(id);
      setBoards((prev) => prev.filter((board) => board.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete board.");
    } finally {
      setSavingBoardId(null);
    }
  };

  return (
    <AppShell
      title="Boards"
      description="Manage boards through /api/boards and related routes. Create, edit visibility/order, delete, and drill into board games."
      actions={
        <Button
          type="button"
          variant="outline"
          className="border-white/30 text-slate-900 hover:border-white hover:bg-white/10 dark:text-white"
          onClick={() => loadBoards()}
          disabled={isLoading}
        >
          <RefreshCcw className="mr-2 size-4" />
          Refresh
        </Button>
      }
    >
      <SignedOut>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-indigo-100/80">
          <p className="text-sm">Boards are protected. Sign in to manage your lists.</p>
          <div className="mt-3">
            <SignInButton mode="modal">
              <Button>Sign in</Button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-950/30">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <h2 className="text-lg font-semibold text-white">Create board</h2>
              <p className="text-sm text-indigo-100/70">Sends POST /api/boards.</p>
            </div>
            <div className="md:col-span-2 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="board-name">Name</Label>
                  <Input
                    id="board-name"
                    value={createForm.name}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Backlog"
                    className="bg-white/5 text-white placeholder:text-indigo-200/70"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="board-order">Visibility</Label>
                  <Button
                    type="button"
                    variant={createForm.isPublic ? "secondary" : "outline"}
                    className="w-full border-white/20 text-white"
                    onClick={() =>
                      setCreateForm((prev) => ({ ...prev, isPublic: !prev.isPublic }))
                    }
                  >
                    {createForm.isPublic ? <Eye className="mr-2 size-4" /> : <EyeOff className="mr-2 size-4" />}
                    {createForm.isPublic ? "Public" : "Private"}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="board-description">Description</Label>
                <Input
                  id="board-description"
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="Notes about this board"
                  className="bg-white/5 text-white placeholder:text-indigo-200/70"
                />
              </div>
              <Button
                type="button"
                onClick={handleCreate}
                disabled={!createForm.name.trim() || creating}
                className="mt-2"
              >
                {creating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
                Create board
              </Button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="space-y-3">
          {boards.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              isSaving={savingBoardId === board.id}
            />
          ))}
        </div>

        {nextCursor ? (
          <div className="mt-4">
            <Button
              variant="outline"
              className="border-white/30 text-slate-900 hover:border-white hover:bg-white/10 dark:text-white"
              onClick={() => loadBoards(nextCursor)}
              disabled={isLoading}
            >
              Load more
            </Button>
          </div>
        ) : null}

        {!isLoading && boards.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-indigo-100/80">
            No boards yet. Create one to get started.
          </div>
        ) : null}
      </SignedIn>
    </AppShell>
  );
}

function BoardCard({
  board,
  onUpdate,
  onDelete,
  isSaving,
}: {
  board: Board;
  onUpdate: (id: string, updates: Partial<Board>) => Promise<void>;
  onDelete: (id: string) => void;
  isSaving: boolean;
}) {
  const [draft, setDraft] = useState({
    name: board.name,
    description: board.description ?? "",
    isPublic: board.isPublic,
    order: board.order,
  });

  useEffect(() => {
    setDraft({
      name: board.name,
      description: board.description ?? "",
      isPublic: board.isPublic,
      order: board.order,
    });
  }, [board.name, board.description, board.isPublic, board.order, board.id]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-indigo-950/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-indigo-200">Board</p>
          <h3 className="text-xl font-semibold text-white">{board.name}</h3>
          <p className="text-xs text-indigo-100/70">Created {formatDate(board.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="border border-white/10 text-slate-900 dark:text-white"
            onClick={() => {
              const next = !draft.isPublic;
              const originalValue = draft.isPublic;
              setDraft((prev) => ({ ...prev, isPublic: next }));
              onUpdate(board.id, { isPublic: next }).catch(() => {
                setDraft((prev) => ({ ...prev, isPublic: originalValue }));
              });
            }}
            disabled={isSaving}
          >
            {draft.isPublic ? <Eye className="mr-2 size-4" /> : <EyeOff className="mr-2 size-4" />}
            {draft.isPublic ? "Public" : "Private"}
          </Button>
          <Link
            href={`/boards/${board.id}`}
            className="text-sm font-semibold text-indigo-100 underline decoration-indigo-500/40 underline-offset-4 hover:text-white"
          >
            Open
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`name-${board.id}`}>Name</Label>
          <Input
            id={`name-${board.id}`}
            value={draft.name}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            className="bg-white/5 text-white"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`order-${board.id}`}>Order</Label>
          <Input
            id={`order-${board.id}`}
            type="number"
            value={draft.order}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, order: Number(event.target.value) || 0 }))
            }
            className="bg-white/5 text-white"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor={`description-${board.id}`}>Description</Label>
          <Input
            id={`description-${board.id}`}
            value={draft.description}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, description: event.target.value }))
            }
            className="bg-white/5 text-white"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="border-white/30 text-slate-900 hover:border-white hover:bg-white/10 dark:text-white"
          onClick={() =>
            onUpdate(board.id, {
              name: draft.name.trim(),
              description: draft.description.trim(),
              isPublic: draft.isPublic,
              order: draft.order,
            })
          }
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Save changes
        </Button>
        <Button
          variant="destructive"
          onClick={() => onDelete(board.id)}
          disabled={isSaving}
          className="gap-2"
        >
          <Trash2 className="size-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}

function formatDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
