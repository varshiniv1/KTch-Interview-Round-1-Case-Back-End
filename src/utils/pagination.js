import { API_BASE_URL } from "./urls.js";

export function buildNextLink(basePath, limit, offset, totalCount) {
  const l = Number.isFinite(Number(limit)) ? Number(limit) : 5;
  const o = Number.isFinite(Number(offset)) ? Number(offset) : 0;

  const nextOffset = o + l;
  if (nextOffset >= totalCount) return null;

  // basePath should start with "/"
  return `${API_BASE_URL}${basePath}?limit=${l}&offset=${nextOffset}`;
}