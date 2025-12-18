const ARGUS_URL_ENV = "ARGUS_URL";
const CLERK_JWT_TEMPLATE_ENV = "CLERK_JWT_TEMPLATE_NAME";

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

export function getClerkJwtTemplate() {
  const raw = process.env[CLERK_JWT_TEMPLATE_ENV];
  const value = raw?.trim();

  return value && value.length > 0 ? value : undefined;
}
