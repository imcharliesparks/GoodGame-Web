"use client";

import { useEffect, useMemo, useState } from "react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Check, Loader2, Plus, Shield, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { fetchBoards, createBoardClient, addBoardGameClient } from "@/lib/client/boards";
import type { Board } from "@/lib/types/board";
import type { BoardGame, GameStatus } from "@/lib/types/board-game";
import type { Game } from "@/lib/types/game";

const STATUSES: GameStatus[] = ["WISHLIST", "PLAYING", "OWNED", "COMPLETED"];

type Props = {
  game: Game;
  onAdded?: (result: { boardName: string; boardGame: BoardGame }) => void;
};

export function AddToBoardSheet({ game, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [boardsError, setBoardsError] = useState<string | null>(null);

  const [selectedBoardId, setSelectedBoardId] = useState<string | undefined>();
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardPublic, setNewBoardPublic] = useState(false);
  const [status, setStatus] = useState<GameStatus>("WISHLIST");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open && boards.length === 0 && !loadingBoards) {
      void loadBoards();
    }
  }, [open, boards.length, loadingBoards]);

  const hasAnyBoard = boards.length > 0;
  const canSubmit = isSubmitting
    ? false
    : Boolean(newBoardName.trim() || selectedBoardId);

  const loadBoards = async (cursor?: string) => {
    setLoadingBoards(true);
    setBoardsError(null);
    try {
      const data = await fetchBoards({ limit: 50, cursor });
      setBoards((prev) => (cursor ? [...prev, ...data.items] : data.items));
      setNextCursor(data.nextCursor);

      if (!cursor && data.items[0] && !selectedBoardId) {
        setSelectedBoardId(data.items[0].id);
      }
    } catch (err) {
      setBoardsError(err instanceof Error ? err.message : "Failed to load boards.");
    } finally {
      setLoadingBoards(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSuccessMessage(null);

    try {
      let targetBoardId = selectedBoardId;
      let targetBoardName = boards.find((board) => board.id === selectedBoardId)?.name;

      const creatingNewBoard = newBoardName.trim().length > 0;
      if (creatingNewBoard) {
        const created = await createBoardClient({
          name: newBoardName.trim(),
          isPublic: newBoardPublic,
        });
        setBoards((prev) => [created, ...prev]);
        targetBoardId = created.id;
        targetBoardName = created.name;
        setSelectedBoardId(created.id);
        setNewBoardName("");
        setNewBoardPublic(false);
      }

      if (!targetBoardId) {
        throw new Error("Select an existing board or create a new one first.");
      }

      const added = await addBoardGameClient({
        boardId: targetBoardId,
        gameId: game.id,
        status,
      });

      setSuccessMessage(`Added to ${targetBoardName ?? "board"}.`);
      if (onAdded) {
        onAdded({ boardName: targetBoardName ?? "board", boardGame: added });
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to add to board.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetSheet = () => {
    setSubmitError(null);
    setSuccessMessage(null);
  };

  const headerText = useMemo(() => {
    if (!hasAnyBoard) return "Create a board to get started";
    return "Add to an existing board or make a new one";
  }, [hasAnyBoard]);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          resetSheet();
        }
      }}
    >
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-white/25 text-white hover:border-white hover:bg-white/10"
        >
          <Plus className="mr-2 size-4" />
          Add to
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="border-white/10 bg-slate-900/95 text-white shadow-2xl shadow-indigo-900/30 backdrop-blur"
      >
        <SheetHeader className="space-y-1.5">
          <SheetTitle className="text-xl text-white">Save “{game.title}”</SheetTitle>
          <SheetDescription className="text-indigo-100/80">{headerText}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          <div className="space-y-1.5">
            <Label className="text-indigo-50">Board</Label>
            {boardsError ? (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                {boardsError}
              </div>
            ) : null}
            {hasAnyBoard ? (
              <Select
                value={selectedBoardId}
                onValueChange={(value) => setSelectedBoardId(value)}
              >
                <SelectTrigger className="w-full border-white/15 bg-white/5 text-white">
                  <SelectValue placeholder="Choose a board" />
                </SelectTrigger>
                <SelectContent className="border-white/15 bg-slate-900 text-white">
                  {boards.map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      <span className="flex flex-col gap-0.5">
                        <span className="font-semibold">{board.name}</span>
                        {board.description ? (
                          <span className="text-xs text-indigo-100/70 line-clamp-1">
                            {board.description}
                          </span>
                        ) : null}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-indigo-100/70">No boards yet. Create one below.</p>
            )}

            {nextCursor ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-indigo-100 underline decoration-indigo-400/60 underline-offset-4 hover:text-white"
                disabled={loadingBoards}
                onClick={() => loadBoards(nextCursor)}
              >
                {loadingBoards ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Load more boards
              </Button>
            ) : null}
          </div>

          <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Create new board</p>
                <p className="text-xs text-indigo-100/70">No description field; edit later if needed.</p>
              </div>
              {newBoardName.trim() ? <Sparkles className="size-4 text-indigo-300" /> : null}
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="new-board-name">Name</Label>
                <Input
                  id="new-board-name"
                  value={newBoardName}
                  onChange={(event) => setNewBoardName(event.target.value)}
                  placeholder="Backlog, Liked, Favorites..."
                  className="bg-white/5 text-white placeholder:text-indigo-100/60"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-indigo-100">
                <input
                  type="checkbox"
                  checked={newBoardPublic}
                  onChange={(event) => setNewBoardPublic(event.target.checked)}
                  className="size-4 rounded border-white/30 bg-white/5 text-indigo-400 focus:ring-indigo-400"
                />
                <span className="flex items-center gap-1.5">
                  <Shield className="size-4 text-indigo-200" />
                  Make board public
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="board-status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as GameStatus)}>
              <SelectTrigger className="w-full border-white/15 bg-white/5 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/15 bg-slate-900 text-white">
                {STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {submitError ? (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {submitError}
            </div>
          ) : null}
          {successMessage ? (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              <div className="flex items-center gap-2">
                <Check className="size-4" />
                <span>{successMessage}</span>
              </div>
            </div>
          ) : null}
        </div>

        <SheetFooter className="p-4">
          <div className="flex flex-col gap-2 w-full">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full"
            >
              {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Add game
            </Button>
            <SignedOut>
              <SignInButton mode="modal">
                <Button type="button" variant="secondary" className="w-full">
                  Sign in to save
                </Button>
              </SignInButton>
            </SignedOut>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
