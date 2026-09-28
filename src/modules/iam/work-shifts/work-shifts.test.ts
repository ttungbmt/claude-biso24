import { describe, expect, it } from "vitest";
import {
  connectTestClient,
  envelopeFetch,
  fetchCall,
} from "../../../../test/helpers/mcp-harness.js";

describe("biso24_get_my_work_shift", () => {
  it("sends the date as currentDate", async () => {
    const fetchMock = envelopeFetch({ name: "Morning" });
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_get_my_work_shift",
      arguments: { date: "2026-09-28" },
    });

    const { url } = fetchCall(fetchMock);
    expect(url.pathname).toBe(
      "/v1/work-shift-employees/work-shift-current-date",
    );
    expect(url.searchParams.get("currentDate")).toBe("2026-09-28");
    expect(result.structuredContent).toEqual({ name: "Morning" });
  });

  it("defaults to today", async () => {
    const fetchMock = envelopeFetch(null);
    const client = await connectTestClient(fetchMock);

    await client.callTool({ name: "biso24_get_my_work_shift", arguments: {} });

    expect(fetchCall(fetchMock).url.searchParams.get("currentDate")).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });

  it("rejects a malformed date", async () => {
    const client = await connectTestClient(envelopeFetch(null));

    const result = await client.callTool({
      name: "biso24_get_my_work_shift",
      arguments: { date: "28/09/2026" },
    });

    expect(result.isError).toBe(true);
  });
});
