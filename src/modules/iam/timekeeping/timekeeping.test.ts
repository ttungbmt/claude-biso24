import { describe, expect, it } from "vitest";
import {
  connectTestClient,
  envelopeFetch,
  fetchCall,
  resultText,
} from "#test/helpers/mcp-harness.js";

describe("timekeeping tools", () => {
  it("biso24_get_my_timekeeping sends a zero-padded month", async () => {
    const fetchMock = envelopeFetch({ days: [] });
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_get_my_timekeeping",
      arguments: { month: 9, year: 2026 },
    });

    const { url } = fetchCall(fetchMock);
    expect(url.pathname).toBe("/v1/timekeeping-employees/personal-data");
    expect(url.searchParams.get("month")).toBe("09");
    expect(url.searchParams.get("year")).toBe("2026");
    expect(result.structuredContent).toEqual({ days: [] });
  });

  it("biso24_get_my_timekeeping_summary defaults to the current year", async () => {
    const fetchMock = envelopeFetch({ totalWorkDays: 200 });
    const client = await connectTestClient(fetchMock);

    await client.callTool({
      name: "biso24_get_my_timekeeping_summary",
      arguments: {},
    });

    const { url } = fetchCall(fetchMock);
    expect(url.pathname).toBe("/v1/timekeeping-employees/dashboard");
    expect(url.searchParams.get("year")).toBe(String(new Date().getFullYear()));
  });

  it("reports a session the API keeps rejecting", async () => {
    const client = await connectTestClient(envelopeFetch(null, 401));

    const result = await client.callTool({
      name: "biso24_get_my_timekeeping_summary",
      arguments: { year: 2026 },
    });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toMatch(/rejected the session/);
  });
});
