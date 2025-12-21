"use client";

import { useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  addBoardGameClient,
  createBoardClient,
  deleteBoardGameClient,
  fetchBoards,
} from "@/lib/client/boards";
import type { GameStatus } from "@/lib/types/board-game";
import type { Board } from "@/lib/types/board";
import type { Game } from "@/lib/types/game";
import { GameResultsCard, type BoardKey, type QuickAddState } from "./GameResultsCard";

type QuickAddMap = Record<string, Partial<Record<BoardKey, QuickAddState>>>;

const BOARD_CONFIG: Record<
  BoardKey,
  { name: string; description: string; isPublic: boolean; status: GameStatus }
> = {
  liked: { name: "Liked", description: "Games you liked", isPublic: true, status: "WISHLIST" },
  wishlist: {
    name: "Wishlist",
    description: "Games you want to play",
    isPublic: true,
    status: "WISHLIST",
  },
  library: {
    name: "Library",
    description: "Games you own",
    isPublic: true,
    status: "OWNED",
  },
};

export function GameResultsGrid({
  games,
  reasons,
  memberships,
}: {
  games: Game[];
  reasons?: Record<string, string>;
  memberships?: Record<string, Array<{ id: string; name: string; status?: string }>>;
}) {
  const [boardIds, setBoardIds] = useState<Partial<Record<BoardKey, string>>>({});
  const [quickAdd, setQuickAdd] = useState<QuickAddMap>({});
  const ensuringRef = useRef<Partial<Record<BoardKey, Promise<{ id: string; name: string }>>>>(
    {},
  );

  if (!games.length) return null;

  const ensureBoard = async (key: BoardKey): Promise<{ id: string; name: string }> => {
    if (boardIds[key]) return { id: boardIds[key]!, name: BOARD_CONFIG[key].name };
    if (ensuringRef.current[key]) return ensuringRef.current[key]!;

    const promise = (async () => {
      let cursor: string | undefined;
      let found: Board | undefined;

      while (!found) {
        const data = await fetchBoards({ limit: 50, cursor });
        found = data.items.find(
          (board) => board.name.toLowerCase() === BOARD_CONFIG[key].name.toLowerCase(),
        );
        if (found || !data.nextCursor) break;
        cursor = data.nextCursor;
      }

      if (found) {
        setBoardIds((prev) => ({ ...prev, [key]: found!.id }));
        return { id: found.id, name: found.name };
      }

      const created = await createBoardClient(BOARD_CONFIG[key]);
      setBoardIds((prev) => ({ ...prev, [key]: created.id }));
      return { id: created.id, name: created.name };
    })();

    ensuringRef.current[key] = promise;
    try {
      return await promise;
    } finally {
      ensuringRef.current[key] = undefined;
    }
  };

  const setQuickState = (gameId: string, key: BoardKey, state: QuickAddState) => {
    setQuickAdd((prev) => ({
      ...prev,
      [gameId]: {
        ...(prev[gameId] ?? {}),
        [key]: state,
      },
    }));
  };

  const resolveBoardKeyFromName = (boardName: string): BoardKey | null => {
    const normalized = boardName.trim().toLowerCase();
    return (Object.keys(BOARD_CONFIG) as BoardKey[]).find(
      (key) => BOARD_CONFIG[key].name.toLowerCase() === normalized,
    ) ?? null;
  };

  const handleQuickAdd = async (game: Game, boardKey: BoardKey) => {
    const currentState = quickAdd[game.id]?.[boardKey];
    if (currentState?.status === "added") return;

    setQuickState(game.id, boardKey, { status: "loading" });
    try {
      const board = await ensureBoard(boardKey);
      await addBoardGameClient({
        boardId: board.id,
        gameId: game.id,
        status: BOARD_CONFIG[boardKey].status,
      });
      setQuickState(game.id, boardKey, {
        status: "added",
        boardName: board.name,
        boardId: board.id,
      });
    } catch (err) {
      setQuickState(game.id, boardKey, {
        status: "error",
        message: err instanceof Error ? err.message : "Failed to add to board.",
      });
    }
  };

  const handleRemove = async (
    game: Game,
    boardKey: BoardKey,
    options: { requireConfirm: boolean; membership: Array<{ id: string; name: string; status?: string }> },
  ) => {
    const currentState = quickAdd[game.id]?.[boardKey];
    if (currentState?.status === "loading") return;

    const membershipEntry = options.membership.find(
      (entry) => entry.name.toLowerCase() === BOARD_CONFIG[boardKey].name.toLowerCase(),
    );
    const boardId =
      currentState?.status === "added" && currentState.boardId
        ? currentState.boardId
        : membershipEntry?.id ?? boardIds[boardKey];

    if (!boardId) {
      setQuickState(game.id, boardKey, {
        status: "error",
        message: "Unknown board to remove from.",
      });
      return;
    }

    if (options.requireConfirm) {
      const confirmed = window.confirm(`Remove ${game.title} from your ${BOARD_CONFIG[boardKey].name}?`);
      if (!confirmed) return;
    }

    setQuickState(game.id, boardKey, { status: "loading" });
    try {
      await deleteBoardGameClient({ boardId, gameId: game.id });
      setQuickState(game.id, boardKey, { status: "idle" });
    } catch (err) {
      setQuickState(game.id, boardKey, {
        status: "error",
        message: err instanceof Error ? err.message : "Failed to remove from board.",
      });
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {games.map((game) => {
        const reason = reasons?.[game.id];
        const membership = memberships?.[game.id] ?? [];

        return (
          <GameResultsCard
            key={game.id}
            game={game}
            reason={reason}
            quickAddState={{
              liked: deriveState("liked", game.id, membership, quickAdd),
              wishlist: deriveState("wishlist", game.id, membership, quickAdd),
              library: deriveState("library", game.id, membership, quickAdd),
            }}
            onQuickAdd={(boardKey) => handleQuickAdd(game, boardKey)}
            onDialogAdded={(boardName) => {
              const boardKey = resolveBoardKeyFromName(boardName);
              if (boardKey) {
                setQuickState(game.id, boardKey, { status: "added", boardName });
              }
            }}
            onRemove={(boardKey) =>
              handleRemove(game, boardKey, { requireConfirm: boardKey !== "liked", membership })
            }
          />
        );
      })}
    </div>
  );
}

export function GameResultsLoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-white/5 bg-gradient-to-br from-slate-800/70 via-slate-900/70 to-indigo-900/40 p-4"
        >
          <div className="flex gap-3">
            <Skeleton className="h-20 w-20 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function deriveState(
  boardKey: BoardKey,
  gameId: string,
  membership: Array<{ id: string; name: string; status?: string }>,
  quickAdd: QuickAddMap,
): QuickAddState {
  const quick = quickAdd[gameId]?.[boardKey];
  if (quick) return quick;

  const fromMembership = membership.find(
    (entry) => entry.name.toLowerCase() === BOARD_CONFIG[boardKey].name.toLowerCase(),
  );
  if (fromMembership) {
    return {
      status: "added",
      boardName: fromMembership.name,
      boardId: fromMembership.id,
      fromInitial: true,
    };
  }

  return { status: "idle" };
}

