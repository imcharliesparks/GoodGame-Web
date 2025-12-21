import { groq } from "@ai-sdk/groq";

const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_API_KEY_ENV = "GROQ_API_KEY";
const GROQ_MODEL_ENV = "GROQ_MODEL";

export function getGroqModel() {
  if (!process.env[GROQ_API_KEY_ENV]) {
    throw new Error(
      `${GROQ_API_KEY_ENV} is not set; configure it to enable Groq recommendations.`,
    );
  }

  const model = process.env[GROQ_MODEL_ENV]?.trim() || DEFAULT_GROQ_MODEL;
  return groq(model);
}
