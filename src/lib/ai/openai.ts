import { openai } from "@ai-sdk/openai";

const DEFAULT_MODEL = "gpt-4o-mini";
const OPENAI_API_KEY_ENV = "OPENAI_API_KEY";

export function getDefaultModel() {
  if (!process.env[OPENAI_API_KEY_ENV]) {
    throw new Error(
      `${OPENAI_API_KEY_ENV} is not set; configure it to enable AI recommendations.`,
    );
  }

  return openai(DEFAULT_MODEL);
}
