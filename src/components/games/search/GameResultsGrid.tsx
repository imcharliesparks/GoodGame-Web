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
import { GameResultsCard, type SaveState, type BoardMembership } from "./GameResultsCard";

type SaveStateMap = Record<string, SaveState>;

const SAVED_BOARD_CONFIG = {
  name: "Saved",
  description: "Games you saved for later",
  isPublic: true,
  status: "OWNED" as GameStatus,
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
  const [savedBoardId, setSavedBoardId] = useState<string | null>(null);
  const [saveStates, setSaveStates] = useState<SaveStateMap>({});
  const ensuringBoardRef = useRef<Promise<{ id: string; name: string }> | null>(null);

  if (!games.length) return null;

  const ensureSavedBoard = async (): Promise<{ id: string; name: string }> => {
    if (savedBoardId) return { id: savedBoardId, name: SAVED_BOARD_CONFIG.name };
    if (ensuringBoardRef.current) return ensuringBoardRef.current;

    const promise = (async () => {
      let cursor: string | undefined;
      let found: Board | undefined;

      while (!found) {
        const data = await fetchBoards({ limit: 50, cursor });
        found = data.items.find(
          (board) => board.name.toLowerCase() === SAVED_BOARD_CONFIG.name.toLowerCase(),
        );
        if (found || !data.nextCursor) break;
        cursor = data.nextCursor;
      }

      if (found) {
        setSavedBoardId(found.id);
        return { id: found.id, name: found.name };
      }

      const created = await createBoardClient(SAVED_BOARD_CONFIG);
      setSavedBoardId(created.id);
      return { id: created.id, name: created.name };
    })();

    ensuringBoardRef.current = promise;
    try {
      return await promise;
    } finally {
      ensuringBoardRef.current = null;
    }
  };

  const setSaveState = (gameId: string, state: SaveState) => {
    setSaveStates((prev) => ({ ...prev, [gameId]: state }));
  };

  const handleSave = async (game: Game) => {
    const currentState = saveStates[game.id];
    if (currentState?.status === "saved") return;

    setSaveState(game.id, { status: "loading" });
    try {
      const board = await ensureSavedBoard();
      await addBoardGameClient({
        boardId: board.id,
        gameId: game.id,
        status: SAVED_BOARD_CONFIG.status,
      });
      setSaveState(game.id, { status: "saved" });
    } catch (err) {
      setSaveState(game.id, {
        status: "error",
        message: err instanceof Error ? err.message : "Failed to save game.",
      });
    }
  };

  const handleRemove = async (game: Game) => {
    const currentState = saveStates[game.id];
    if (currentState?.status === "loading") return;

    if (!savedBoardId) {
      setSaveState(game.id, {
        status: "error",
        message: "Cannot remove - board not found.",
      });
      return;
    }

    setSaveState(game.id, { status: "loading" });
    try {
      await deleteBoardGameClient({ boardId: savedBoardId, gameId: game.id });
      setSaveState(game.id, { status: "idle" });
    } catch (err) {
      setSaveState(game.id, {
        status: "error",
        message: err instanceof Error ? err.message : "Failed to remove save.",
      });
    }
  };

  const handleBoardAdded = (gameId: string, boardName: string) => {
    // Optional: Show a toast notification
    console.log(`Added ${gameId} to ${boardName}`);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {games.map((game) => {
        const reason = reasons?.[game.id];
        const membership = memberships?.[game.id] ?? [];

        // Convert membership data to BoardMembership format
        const boardMemberships: BoardMembership[] = membership
          .filter((m) => m.name.toLowerCase() !== SAVED_BOARD_CONFIG.name.toLowerCase())
          .map((m) => ({
            boardId: m.id,
            boardName: m.name,
            status: (m.status?.toUpperCase() as GameStatus) || "OWNED",
          }));

        // Determine save state from membership or tracked state
        const isSavedFromMembership = membership.some(
          (m) => m.name.toLowerCase() === SAVED_BOARD_CONFIG.name.toLowerCase(),
        );
        const saveState: SaveState =
          saveStates[game.id] ||
          (isSavedFromMembership ? { status: "saved" } : { status: "idle" });

        return (
          <GameResultsCard
            key={game.id}
            game={game}
            reason={reason}
            saveState={saveState}
            onSave={() => handleSave(game)}
            onRemove={() => handleRemove(game)}
            onBoardAdded={(boardName) => handleBoardAdded(game.id, boardName)}
            boardMemberships={boardMemberships}
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
