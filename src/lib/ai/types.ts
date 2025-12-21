import { z } from "zod";

export const GameRecommendationIntentSchema = z
  .object({
    genres: z.array(z.string().min(1)).optional(),
    platforms: z.array(z.string().min(1)).optional(),
    ownership: z.enum(["OWNED", "WISHLIST"]).optional(),
    playStatus: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]).optional(),
    mood: z.enum(["relaxed", "intense", "short-session"]).optional(),
    maxResults: z.number().int().min(1).max(20).optional(),
    includeRelatedFields: z.boolean().optional(),
  })
  .strict();

export type GameRecommendationIntent = z.infer<
  typeof GameRecommendationIntentSchema
>;

export const RankedRecommendationsSchema = z.object({
  results: z
    .array(
      z.object({
        gameId: z.string().min(1),
        reason: z.string().min(1).max(240),
      }),
    )
    .max(20),
});

export type RankedRecommendations = z.infer<typeof RankedRecommendationsSchema>;
