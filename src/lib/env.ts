const ARGUS_URL_ENV = "ARGUS_URL";

export function getArgusUrl() {
  const url = process.env[ARGUS_URL_ENV];

  if (!url) {
    throw new Error(`${ARGUS_URL_ENV} is not set; configure the backend URL in your environment.`);
  }

  return url.replace(/\/$/, "");
}
