import { describe, expect, it } from "vitest";
import {
  apiCalls,
  connectTestClient,
  envelopeFetch,
  fetchCall,
  resultText,
} from "#test/helpers/mcp-harness.js";

describe("request tools", () => {
  it("biso24_list_my_requests maps offset to page and reports has_more", async () => {
    const fetchMock = envelopeFetch({
      data: [{ _id: "r3" }, { _id: "r4" }],
      total: 5,
      limit: 2,
      page: 2,
      totalPages: 3,
      totalPendingApproval: 1,
    });
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_list_my_requests",
      arguments: { limit: 2, offset: 2 },
    });

    const { url } = fetchCall(fetchMock);
    expect(url.pathname).toBe("/v1/request-employees");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      type: "OWNER",
      page: "2",
      limit: "2",
    });
    expect(result.structuredContent).toEqual({
      items: [{ _id: "r3" }, { _id: "r4" }],
      total: 5,
      count: 2,
      offset: 2,
      has_more: true,
      next_offset: 4,
      total_pending_approval: 1,
    });
  });

  it("biso24_list_my_requests rejects an offset off the page boundary", async () => {
    const fetchMock = envelopeFetch(null);
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_list_my_requests",
      arguments: { limit: 20, offset: 5 },
    });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toMatch(/multiple of limit/);
    expect(apiCalls(fetchMock)).toHaveLength(0);
  });

  it("biso24_list_request_types paginates client-side", async () => {
    const fetchMock = envelopeFetch([
      { _id: "t1" },
      { _id: "t2" },
      { _id: "t3" },
    ]);
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_list_request_types",
      arguments: { limit: 2 },
    });

    expect(fetchCall(fetchMock).url.pathname).toBe("/v1/request-managements");
    expect(result.structuredContent).toEqual({
      items: [{ _id: "t1" }, { _id: "t2" }],
      total: 3,
      count: 2,
      offset: 0,
      has_more: true,
      next_offset: 2,
    });
  });
});
