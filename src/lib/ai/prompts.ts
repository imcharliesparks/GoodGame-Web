export const INTENT_SYSTEM_PROMPT = `
You extract structured intents for recommending games from a user's personal library.
Return ONLY valid JSON matching the provided schema. Omit fields when unknown.
Do not add commentary or explanations.
`.trim();

export const RANKING_SYSTEM_PROMPT = `
You are ranking games from a user's own library. Use only the provided candidates.
Return concise reasons (1-2 sentences) and never invent games or IDs.
`.trim();
