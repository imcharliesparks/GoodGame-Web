"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { ChevronLeft, Loader2, Trash2 } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchBoard, fetchBoardGames, addBoardGameClient, updateBoardGameClient, deleteBoardGameClient, reorderBoardGameClient } from "@/lib/client/boards";
import type { Board } from "@/lib/types/board";
import type { BoardGameWithGame, GameStatus } from "@/lib/types/board-game";

const STATUSES: GameStatus[] = ["OWNED", "PLAYING", "COMPLETED", "WISHLIST"];
const PAGE_SIZE = 25;

export default function BoardDetailsPage({ params }: { params: { id: string } }) {
  const boardId = params.id;
  const [board, setBoard] = useState<Board | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [isLoadingBoard, setIsLoadingBoard] = useState(true);

  const [games, setGames] = useState<BoardGameWithGame[]>([]);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [pendingGameId, setPendingGameId] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({
    gameId: "",
    status: "WISHLIST" as GameStatus,
    rating: "",
    notes: "",
    order: "",
  });

  const description =
    "View and manage board games via /api/boards/:id and nested board-games routes. Public boards load without auth; mutations require Clerk.";

  const loadBoard = async () => {
    setIsLoadingBoard(true);
    setBoardError(null);
    try {
      const data = await fetchBoard(boardId);
      setBoard(data);
    } catch (err) {
      setBoardError(err instanceof Error ? err.message : "Failed to load board.");
    } finally {
      setIsLoadingBoard(false);
    }
  };

  const loadBoardGames = async (cursor?: string) => {
    setIsLoadingGames(true);
    setGamesError(null);
    try {
      const data = await fetchBoardGames({ boardId, limit: PAGE_SIZE, cursor });
      setGames((prev) => (cursor ? [...prev, ...data.items] : data.items));
      setNextCursor(data.nextCursor);
    } catch (err) {
      setGamesError(err instanceof Error ? err.message : "Failed to load board games.");
    } finally {
      setIsLoadingGames(false);
    }
  };

  useEffect(() => {
    loadBoard();
    loadBoardGames();
  }, [boardId]);

  const handleAdd = async () => {
    setPendingGameId("new");
    setGamesError(null);
    try {
      const created = await addBoardGameClient({
        boardId,
        gameId: addForm.gameId.trim(),
        status: addForm.status,
        rating: addForm.rating ? Number(addForm.rating) : undefined,
        notes: addForm.notes.trim() || undefined,
        order: addForm.order ? Number(addForm.order) : undefined,
      });
      setGames((prev) => [{ ...created, game: null }, ...prev]);
      setAddForm({ gameId: "", status: "WISHLIST", rating: "", notes: "", order: "" });
    } catch (err) {
      setGamesError(err instanceof Error ? err.message : "Failed to add board game.");
    } finally {
      setPendingGameId(null);
    }
  };

  const handleUpdateGame = async (gameId: string, updates: Partial<BoardGameWithGame>) => {
    setPendingGameId(gameId);
    setGamesError(null);
    try {
      const updated = await updateBoardGameClient({
        boardId,
        gameId,
        status: updates.status as GameStatus | undefined,
        rating: updates.rating as number | undefined,
        notes: updates.notes,
      });
      setGames((prev) =>
        prev.map((item) =>
          item.gameId === gameId ? { ...item, ...updated } : item,
        ),
      );
    } catch (err) {
      setGamesError(err instanceof Error ? err.message : "Failed to update board game.");
    } finally {
      setPendingGameId(null);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    setPendingGameId(gameId);
    setGamesError(null);
    try {
      await deleteBoardGameClient({ boardId, gameId });
      setGames((prev) => prev.filter((item) => item.gameId !== gameId));
    } catch (err) {
      setGamesError(err instanceof Error ? err.message : "Failed to delete board game.");
    } finally {
      setPendingGameId(null);
    }
  };

  const handleReorderGame = async (gameId: string, order: number) => {
    setPendingGameId(gameId);
    setGamesError(null);
    try {
      const updated = await reorderBoardGameClient({ boardId, gameId, order });
      setGames((prev) =>
        prev.map((item) =>
          item.gameId === gameId ? { ...item, ...updated } : item,
        ),
      );
    } catch (err) {
      setGamesError(err instanceof Error ? err.message : "Failed to reorder board game.");
    } finally {
      setPendingGameId(null);
    }
  };

  const boardTitle = useMemo(() => {
    if (board?.name) return board.name;
    if (isLoadingBoard) return "Loading board...";
    if (boardError) return "Board unavailable";
    return "Board";
  }, [board?.name, boardError, isLoadingBoard]);

  return (
    <AppShell title={boardTitle} description={description}>
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/boards"
          className="inline-flex items-center gap-2 text-indigo-100 underline decoration-indigo-500/50 underline-offset-4 hover:text-white"
        >
          <ChevronLeft className="size-4" />
          Back to boards
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-950/30">
          {boardError ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {boardError}
            </div>
          ) : null}
          {isLoadingBoard && !board ? (
            <p className="text-sm text-indigo-100/70">Loading board details...</p>
          ) : null}
          {board ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-100">
                  {board.isPublic ? "Public" : "Private"}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-100">
                  Order {board.order}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-100">
                  Created {formatDate(board.createdAt)}
                </span>
              </div>
              <p className="text-sm text-indigo-100/80">{board.description || "No description."}</p>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-indigo-950/30">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">Add a game</h2>
          </div>
          <p className="text-sm text-indigo-100/70">POST /api/boards/:id/board-games</p>

          <SignedOut>
            <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-indigo-100/80">
              Sign in to add or edit board games.
              <div className="mt-2">
                <SignInButton mode="modal">
                  <Button size="sm">Sign in</Button>
                </SignInButton>
              </div>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="mt-4 grid gap-3">
              <div className="space-y-1">
                <Label htmlFor="game-id">gameId</Label>
                <Input
                  id="game-id"
                  value={addForm.gameId}
                  onChange={(event) =>
                    setAddForm((prev) => ({ ...prev, gameId: event.target.value }))
                  }
                  className="bg-white/5 text-white"
                  placeholder="Cached game ObjectId"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={addForm.status}
                    onChange={(event) =>
                      setAddForm((prev) => ({ ...prev, status: event.target.value as GameStatus }))
                    }
                    className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status} className="bg-slate-900 text-white">
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rating">Rating</Label>
                  <Input
                    id="rating"
                    type="number"
                    value={addForm.rating}
                    onChange={(event) =>
                      setAddForm((prev) => ({ ...prev, rating: event.target.value }))
                    }
                    className="bg-white/5 text-white"
                    placeholder="0-100"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="order">Order</Label>
                  <Input
                    id="order"
                    type="number"
                    value={addForm.order}
                    onChange={(event) =>
                      setAddForm((prev) => ({ ...prev, order: event.target.value }))
                    }
                    className="bg-white/5 text-white"
                    placeholder="Optional index"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={addForm.notes}
                  onChange={(event) =>
                    setAddForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  className="bg-white/5 text-white"
                  placeholder="Optional notes"
                />
              </div>

              <Button
                type="button"
                onClick={handleAdd}
                disabled={!addForm.gameId.trim() || pendingGameId === "new"}
                className="mt-2"
              >
                {pendingGameId === "new" ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Add to board
              </Button>
            </div>
          </SignedIn>
        </div>
      </div>

      {gamesError ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {gamesError}
        </div>
      ) : null}

      <div className="space-y-4">
        {games.map((item) => (
          <BoardGameCard
            key={item.gameId}
            boardGame={item}
            onUpdate={handleUpdateGame}
            onDelete={handleDeleteGame}
            onReorder={handleReorderGame}
            isSaving={pendingGameId === item.gameId}
          />
        ))}
      </div>

      {nextCursor ? (
        <Button
          variant="outline"
          className="border-white/30 text-slate-900 hover:border-white hover:bg-white/10 dark:text-white"
          onClick={() => loadBoardGames(nextCursor)}
          disabled={isLoadingGames}
        >
          Load more
        </Button>
      ) : null}

      {isLoadingGames && games.length === 0 ? (
        <p className="text-sm text-indigo-100/70">Loading board games...</p>
      ) : null}

      {!isLoadingGames && games.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-indigo-100/80">
          No board games yet. Add one using gameId.
        </div>
      ) : null}
    </AppShell>
  );
}

function BoardGameCard({
  boardGame,
  onUpdate,
  onDelete,
  onReorder,
  isSaving,
}: {
  boardGame: BoardGameWithGame;
  onUpdate: (gameId: string, updates: Partial<BoardGameWithGame>) => void;
  onDelete: (gameId: string) => void;
  onReorder: (gameId: string, order: number) => void;
  isSaving: boolean;
}) {
  const [draft, setDraft] = useState({
    status: boardGame.status,
    rating: boardGame.rating ?? "",
    notes: boardGame.notes ?? "",
    order: boardGame.order,
  });

  useEffect(() => {
    setDraft({
      status: boardGame.status,
      rating: boardGame.rating ?? "",
      notes: boardGame.notes ?? "",
      order: boardGame.order,
    });
  }, [boardGame.status, boardGame.rating, boardGame.notes, boardGame.order, boardGame.gameId]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-indigo-950/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-indigo-200">Game</p>
          <h3 className="text-lg font-semibold text-white">
            {boardGame.game?.title ?? boardGame.gameId}
          </h3>
          <p className="text-xs text-indigo-100/70">Status: {boardGame.status}</p>
        </div>
        <SignedIn>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-white/30 text-slate-900 hover:border-white hover:bg-white/10 dark:text-white"
              onClick={() =>
                onUpdate(boardGame.gameId, {
                  status: draft.status,
                  rating: draft.rating ? Number(draft.rating) : undefined,
                  notes: draft.notes,
                })
              }
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={() => onDelete(boardGame.gameId)}
              disabled={isSaving}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </SignedIn>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="space-y-1">
          <Label>Status</Label>
          <select
            value={draft.status}
            onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value as GameStatus }))}
            className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status} className="bg-slate-900 text-white">
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Rating</Label>
          <Input
            type="number"
            value={draft.rating}
            onChange={(event) => setDraft((prev) => ({ ...prev, rating: event.target.value }))}
            className="bg-white/5 text-white"
            placeholder="Optional"
          />
        </div>
        <div className="space-y-1">
          <Label>Order</Label>
          <Input
            type="number"
            value={draft.order}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, order: Number(event.target.value) || 0 }))
            }
            className="bg-white/5 text-white"
          />
          <SignedIn>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 border-white/30 text-slate-900 hover:border-white hover:bg-white/10 dark:text-white"
              onClick={() => onReorder(boardGame.gameId, Number(draft.order) || 0)}
              disabled={isSaving}
            >
              Reorder
            </Button>
          </SignedIn>
        </div>
        <div className="space-y-1 md:col-span-2 md:col-start-3">
          <Label>Notes</Label>
          <Input
            value={draft.notes}
            onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
            className="bg-white/5 text-white"
            placeholder="Notes about this game"
          />
        </div>
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
