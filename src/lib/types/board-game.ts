import type { Game } from "./game";

export type GameStatus = "OWNED" | "PLAYING" | "COMPLETED" | "WISHLIST";

export type BoardGame = {
  id: string;
  boardId: string;
  gameId: string;
  order: number;
  status: GameStatus;
  platform?: string;
  rating?: number;
  notes?: string;
  addedAt: string | Date;
};

export type BoardGameWithGame = BoardGame & {
  game: Game | null;
};
