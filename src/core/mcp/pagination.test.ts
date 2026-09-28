import { describe, expect, it } from "vitest";
import { pageMeta, paginate, toPageParams } from "./pagination";

describe("pagination", () => {
  it("maps offset to a 1-based page", () => {
    expect(toPageParams({ limit: 20, offset: 40 })).toEqual({
      page: 3,
      limit: 20,
    });
  });

  it("rejects an offset that is not on a page boundary", () => {
    expect(() => toPageParams({ limit: 20, offset: 5 })).toThrow(
      /multiple of limit/,
    );
  });

  it("reports has_more and next_offset", () => {
    expect(pageMeta({ limit: 2, offset: 0 }, 2, 5)).toEqual({
      total: 5,
      count: 2,
      offset: 0,
      has_more: true,
      next_offset: 2,
    });
    expect(pageMeta({ limit: 2, offset: 4 }, 1, 5)).toMatchObject({
      has_more: false,
    });
  });

  it("slices client-side lists", () => {
    expect(paginate([1, 2, 3], { limit: 2, offset: 2 })).toEqual({
      items: [3],
      total: 3,
      count: 1,
      offset: 2,
      has_more: false,
    });
  });
});
