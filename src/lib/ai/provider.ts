const PROVIDER_ENV = "CURRENT_RAG_PROVIDER";

export type AiProvider = "OPENAI" | "GROQ";

export function getProvider(): AiProvider {
  const raw = process.env[PROVIDER_ENV];
  if (!raw) return "OPENAI";

  const normalized = raw.replace(/[^a-zA-Z]/g, "").toUpperCase();
  if (normalized === "OPENAI") return "OPENAI";
  if (normalized === "GROQ") return "GROQ";

  throw new Error(`${PROVIDER_ENV} must be OPENAI or GROQ (received "${raw}").`);
}
