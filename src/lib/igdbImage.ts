const IGDB_PREFIX_REGEX =
  /^(https?:)?\/\/images\.igdb\.com\/igdb\/image\/upload\/([^/]+)\/(.+)$/i;

/**
 * Normalize IGDB image URLs to a requested size.
 * Returns null for missing input and leaves non-IGDB URLs unchanged.
 */
export function igdbImage(
  url: string | null | undefined,
  size = "t_1080p",
): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const requestedSize = size?.trim() || "t_1080p";
  const match = trimmed.match(IGDB_PREFIX_REGEX);
  if (!match) return trimmed;

  const scheme = match[1] ?? "";
  const rest = match[3];
  return `${scheme}//images.igdb.com/igdb/image/upload/${requestedSize}/${rest}`;
}
