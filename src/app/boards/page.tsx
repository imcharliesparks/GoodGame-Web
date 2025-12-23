"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Ellipsis, Eye, EyeOff, Loader2, Plus, RefreshCcw, Trash2, ExternalLink } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { fetchBoards, createBoardClient, updateBoardClient, deleteBoardClient, fetchBoardGames } from "@/lib/client/boards";
import { igdbImage } from "@/lib/igdbImage";
import type { Board } from "@/lib/types/board";
import type { BoardGameWithGame } from "@/lib/types/board-game";

const PAGE_SIZE = 20;

export default function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", isPublic: true });
  const [createOpen, setCreateOpen] = useState(false);
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
      setCreateForm({ name: "", description: "", isPublic: true });
      setCreateOpen(false);
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
        <div className="flex items-center gap-2">
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
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:brightness-110 cursor-pointer"
              >
                <Plus className="mr-2 size-4" />
                Create board
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-950/95 text-white backdrop-blur border-white/10 px-6 sm:px-8">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-white">Create board</DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-3">
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
                      className="w-full border-white/20 text-black cursor-pointer"
                      onClick={() =>
                        setCreateForm((prev) => ({ ...prev, isPublic: !prev.isPublic }))
                      }
                    >
                      {createForm.isPublic ? (
                        <Eye className="mr-2 size-4" />
                      ) : (
                        <EyeOff className="mr-2 size-4" />
                      )}
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
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleCreate}
                    disabled={!createForm.name.trim() || creating}
                    className="w-full cursor-pointer"
                  >
                    {creating ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 size-4" />
                    )}
                    Create board
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
  const [previewGames, setPreviewGames] = useState<BoardGameWithGame[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);

  useEffect(() => {
    setDraft({
      name: board.name,
      description: board.description ?? "",
      isPublic: board.isPublic,
      order: board.order,
    });
  }, [board.name, board.description, board.isPublic, board.order, board.id]);

  useEffect(() => {
    const loadPreview = async () => {
      setIsPreviewLoading(true);
      try {
        const data = await fetchBoardGames({ boardId: board.id, limit: 4 });
        setPreviewGames(data.items);
      } catch {
        setPreviewGames([]);
      } finally {
        setIsPreviewLoading(false);
      }
    };
    void loadPreview();
  }, [board.id]);

  const thumbnails = previewGames
    .map((item) =>
      igdbImage(
        item.game?.coverUrl ||
          item.game?.headerImageUrl ||
          item.game?.backgroundImageUrl ||
          item.game?.screenshotUrls?.[0],
        "t_720p",
      ),
    )
    .filter((url): url is string => Boolean(url))
    .slice(0, 4);

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/50 to-indigo-950/40 p-4 shadow-lg shadow-indigo-950/30">
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/5 via-transparent to-indigo-500/5 opacity-40 group-hover:opacity-60 transition" />

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-indigo-200/90">Board</p>
          <h3 className="text-xl font-semibold text-white">{board.name}</h3>
          <p className="text-xs text-indigo-100/70">Created {formatDate(board.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/boards/${board.id}`}
            className="rounded-full bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            <span className="inline-flex items-center gap-1">
              Open <ExternalLink className="size-4" />
            </span>
          </Link>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-full bg-white/5 backdrop-blur border border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white active:translate-y-[1px] active:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:opacity-40 disabled:pointer-events-none transition"
                aria-label="Board options"
              >
                <Ellipsis className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-slate-950/90 text-white backdrop-blur-lg border-white/10">
              <SheetHeader>
                <SheetTitle className="text-xl font-semibold">Edit board</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor={`name-${board.id}`}>Name</Label>
                  <Input
                    id={`name-${board.id}`}
                    value={draft.name}
                    onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                    className="bg-white/5 text-white placeholder:text-indigo-100/60"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`description-${board.id}`}>Description</Label>
                  <Input
                    id={`description-${board.id}`}
                    value={draft.description}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, description: event.target.value }))
                    }
                    className="bg-white/5 text-white placeholder:text-indigo-100/60"
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
                    className="bg-white/5 text-white placeholder:text-indigo-100/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Button
                    type="button"
                    variant={draft.isPublic ? "secondary" : "outline"}
                    className="w-full border-white/20 text-white"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        isPublic: !prev.isPublic,
                      }))
                    }
                  >
                    {draft.isPublic ? <Eye className="mr-2 size-4" /> : <EyeOff className="mr-2 size-4" />}
                    {draft.isPublic ? "Public" : "Private"}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="default"
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:brightness-105"
                    disabled={isSaving}
                    onClick={() => {
                      setIsSheetOpen(false);
                      return onUpdate(board.id, {
                        name: draft.name.trim(),
                        description: draft.description.trim(),
                        isPublic: draft.isPublic,
                        order: draft.order,
                      });
                    }}
                  >
                    {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Save changes
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                    onClick={() => setDraft({
                      name: board.name,
                      description: board.description ?? "",
                      isPublic: board.isPublic,
                      order: board.order,
                    })}
                    disabled={isSaving}
                  >
                    Reset
                  </Button>
                </div>
                <div className="border-t border-white/10 pt-3">
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={() => {
                      setIsSheetOpen(false);
                      onDelete(board.id);
                    }}
                    disabled={isSaving}
                  >
                    <Trash2 className="size-4" />
                    Delete board
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Link
        href={`/boards/${board.id}`}
        className="mt-4 block overflow-hidden rounded-xl border border-white/10 bg-white/5 transition hover:border-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
      >
        <div className="aspect-[4/3]">
          <div className="grid h-full grid-cols-2 grid-rows-2 gap-1">
            {thumbnails.length ? (
              thumbnails.map((url, index) => (
                <div key={`${board.id}-thumb-${index}`} className="relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`${board.name} preview ${index + 1}`}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-900/10 via-transparent to-slate-900/30 opacity-0 transition group-hover:opacity-100" />
                </div>
              ))
            ) : (
              <div className="col-span-2 row-span-2 flex h-full items-center justify-center bg-gradient-to-br from-slate-800/80 to-indigo-900/60 text-sm text-indigo-100/70">
                {isPreviewLoading ? "Loading preview..." : "No games yet"}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between px-3 py-2 text-sm text-indigo-100/80">
          <span className="inline-flex items-center gap-2">
            {board.isPublic ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            {board.isPublic ? "Public board" : "Private board"}
          </span>
          <span>{thumbnails.length ? `${thumbnails.length} preview${thumbnails.length === 1 ? "" : "s"}` : "No preview"}</span>
        </div>
      </Link>
    </article>
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
