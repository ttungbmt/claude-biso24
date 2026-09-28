import { z } from "zod";

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/** Input fields shared by every list tool. */
export const paginationShape = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_LIMIT)
    .default(DEFAULT_LIMIT)
    .describe(`Max items to return (1-${MAX_LIMIT}).`),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      "Number of items to skip. Use next_offset from the previous response to get the next page.",
    ),
};

export interface Page {
  limit: number;
  offset: number;
}

export interface PageMeta {
  total: number;
  count: number;
  offset: number;
  has_more: boolean;
  next_offset?: number;
}

/**
 * Maps limit/offset to Biso24's 1-based page/limit. Offset must land on a
 * page boundary, which holds when the caller follows next_offset.
 */
export function toPageParams({ limit, offset }: Page): {
  page: number;
  limit: number;
} {
  if (offset % limit !== 0) {
    throw new Error(
      `offset (${offset}) must be a multiple of limit (${limit}). Use next_offset from the previous response.`,
    );
  }
  return { page: offset / limit + 1, limit };
}

export function pageMeta(
  { offset }: Page,
  count: number,
  total: number,
): PageMeta {
  const has_more = offset + count < total;
  return {
    total,
    count,
    offset,
    has_more,
    ...(has_more ? { next_offset: offset + count } : {}),
  };
}

/** Client-side pagination for endpoints that return everything at once. */
export function paginate<T>(items: T[], page: Page): { items: T[] } & PageMeta {
  const slice = items.slice(page.offset, page.offset + page.limit);
  return { items: slice, ...pageMeta(page, slice.length, items.length) };
}
