"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { SignedOut, SignInButton } from "@clerk/nextjs";
import { Check, ChevronsUpDown, Loader2, Plus, Shield, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addBoardGameClient, createBoardClient, fetchBoards } from "@/lib/client/boards";
import type { Board } from "@/lib/types/board";
import type { BoardGame, GameStatus } from "@/lib/types/board-game";
import type { Game } from "@/lib/types/game";
import { cn } from "@/lib/utils";

const STATUSES: GameStatus[] = ["WISHLIST", "PLAYING", "OWNED", "COMPLETED"];

type Props = {
  game: Game;
  onAdded?: (result: { boardName: string; boardGame: BoardGame }) => void;
  trigger?: ReactNode;
};

export function AddToBoardDialog({ game, onAdded, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [boardsError, setBoardsError] = useState<string | null>(null);

  const [boardPopoverOpen, setBoardPopoverOpen] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string | undefined>();
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardPublic, setNewBoardPublic] = useState(true);
  const [status, setStatus] = useState<GameStatus | undefined>(undefined);
  const [platform, setPlatform] = useState<string | undefined>(undefined);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const platformClearOption = "__platform_none__";
  const statusClearValue = "__no_status__";

  const platformOptions = useMemo(
    () => Array.from(new Set(game.platforms ?? [])).filter(Boolean),
    [game.platforms],
  );

  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === selectedBoardId),
    [boards, selectedBoardId],
  );

  const pickDefaultBoard = (list: Board[]) => {
    const libraryBoard = list.find(
      (board) => board.name.trim().toLowerCase() === "library",
    );
    return libraryBoard ?? list[0];
  };

  const humanizeStatus = (value: GameStatus) =>
    value
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

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
      setBoards((prev) => {
        const mergedBoards = cursor ? [...prev, ...data.items] : data.items;
        if (!selectedBoardId && mergedBoards.length > 0) {
          const defaultBoard = pickDefaultBoard(mergedBoards);
          if (defaultBoard) {
            setSelectedBoardId(defaultBoard.id);
          }
        }
        return mergedBoards;
      });
      setNextCursor(data.nextCursor);
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
        setNewBoardPublic(true);
      }

      if (!targetBoardId) {
        throw new Error("Select an existing board or create a new one first.");
      }

      const trimmedPlatform = (platform ?? "").trim();

      const added = await addBoardGameClient({
        boardId: targetBoardId,
        gameId: game.id,
        status: status ?? undefined,
        platforms: trimmedPlatform ? [trimmedPlatform] : undefined,
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

  const resetDialog = () => {
    setSubmitError(null);
    setSuccessMessage(null);
  };

  const headerText = useMemo(() => {
    if (!hasAnyBoard) return "Create a board to get started";
    return "Add to an existing board or make a new one";
  }, [hasAnyBoard]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetDialog();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-white/25 text-slate-900 hover:border-white hover:bg-white/10 dark:text-white"
          >
            <Plus className="mr-2 size-4" />
            Add to
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl border-white/15 bg-slate-950/90 text-white shadow-2xl shadow-indigo-900/30 backdrop-blur">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl text-white">Save "{game.title}"</DialogTitle>
          <DialogDescription className="text-indigo-100/80">
            {headerText}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label className="text-indigo-50">Board</Label>
            {boardsError ? (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                {boardsError}
              </div>
            ) : null}
            {hasAnyBoard ? (
              <Popover open={boardPopoverOpen} onOpenChange={setBoardPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={boardPopoverOpen}
                    className="flex w-full items-center justify-between border-white/15 bg-white/5 text-white hover:bg-white/10"
                  >
                    <span className="flex min-w-0 flex-col text-left">
                      <span className="truncate font-semibold">
                        {selectedBoard?.name ?? "Choose a board"}
                      </span>
                      <span className="truncate text-xs text-indigo-100/70">
                        {selectedBoard?.description ?? "Search or pick an existing board"}
                      </span>
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-indigo-100/70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[520px] p-0" align="start">
                  <Command loop>
                    <CommandInput placeholder="Search boards..." />
                    <CommandList>
                      <CommandEmpty>No boards found.</CommandEmpty>
                      <CommandGroup>
                        {boards.map((board) => (
                          <CommandItem
                            key={board.id}
                            value={`${board.name} ${board.description ?? ""}`}
                            onSelect={() => {
                              setSelectedBoardId(board.id);
                              setBoardPopoverOpen(false);
                            }}
                            className="flex items-start gap-2"
                          >
                            <Check
                              className={cn(
                                "mt-0.5 h-4 w-4",
                                selectedBoardId === board.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <span className="flex flex-col gap-0.5">
                              <span className="font-semibold text-white">{board.name}</span>
                              {board.description ? (
                                <span className="text-xs text-indigo-100/70 line-clamp-1">
                                  {board.description}
                                </span>
                              ) : null}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
                <p className="text-xs text-indigo-100/70">Public by default; make it private here.</p>
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
                  checked={!newBoardPublic}
                  onChange={(event) => setNewBoardPublic(!event.target.checked)}
                  className="size-4 rounded border-white/30 bg-white/5 text-indigo-400 focus:ring-indigo-400"
                />
                <span className="flex items-center gap-1.5">
                  <Shield className="size-4 text-indigo-200" />
                  Make board private
                </span>
              </label>
            </div>
          </div>

          <Separator className="bg-white/10" />

          <div className="space-y-2">
            <Label htmlFor="board-status">Status (optional)</Label>
            <Select
              value={status ?? undefined}
              onValueChange={(value) =>
                setStatus(value === statusClearValue ? undefined : (value as GameStatus))
              }
            >
              <SelectTrigger className="w-full border-white/15 bg-white/5 text-white">
                <SelectValue placeholder="Select a status (optional)" />
              </SelectTrigger>
              <SelectContent className="border-white/15 bg-slate-900 text-white">
                <SelectItem value={statusClearValue}>No status</SelectItem>
                {STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {humanizeStatus(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-indigo-100/70">
              Add a status if you want to track progress; otherwise leave it blank.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="board-platform">Platform (optional)</Label>
            {platformOptions.length > 0 ? (
              <Select
                value={platform ?? undefined}
                onValueChange={(value) =>
                  setPlatform(value === platformClearOption ? undefined : value)
                }
              >
                <SelectTrigger
                  id="board-platform"
                  className="w-full border-white/15 bg-white/5 text-white"
                >
                  <SelectValue placeholder="Select a platform" />
                </SelectTrigger>
                <SelectContent className="border-white/15 bg-slate-900 text-white">
                  <SelectItem value={platformClearOption}>No platform</SelectItem>
                  {platformOptions.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="board-platform"
                value={platform ?? ""}
                onChange={(event) =>
                  setPlatform(event.target.value ? event.target.value : undefined)
                }
                placeholder="Enter platform (optional)"
                className="bg-white/5 text-white placeholder:text-indigo-100/60"
              />
            )}
            <p className="text-xs text-indigo-100/70">
              Optionally track which platform you plan to play on.
            </p>
          </div>

          <Separator className="bg-white/10" />

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

        <DialogFooter className="w-full">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
