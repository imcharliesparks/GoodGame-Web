import { openai } from "@ai-sdk/openai";

const OPENAI_MODEL = "gpt-4o-mini";
const OPENAI_API_KEY_ENV = "OPENAI_API_KEY";

export function getOpenAiModel() {
  if (!process.env[OPENAI_API_KEY_ENV]) {
    throw new Error(
      `${OPENAI_API_KEY_ENV} is not set; configure it to enable OpenAI recommendations.`,
    );
  }

  return openai(OPENAI_MODEL);
}
