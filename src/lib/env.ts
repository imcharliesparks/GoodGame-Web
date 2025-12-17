const ARGUS_URL_ENV = "ARGUS_URL";

export function getArgusUrl() {
  const raw = process.env[ARGUS_URL_ENV];

  if (!raw) {
    throw new Error(`${ARGUS_URL_ENV} is not set; configure the backend URL in your environment.`);
  }

  const trimmed = raw.trim();
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(
      `${ARGUS_URL_ENV} must be a valid absolute URL (include http:// or https://). Received: ${raw}`,
    );
  }

  return parsed.toString().replace(/\/$/, "");
}
