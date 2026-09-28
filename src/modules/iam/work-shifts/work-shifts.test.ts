import { describe, expect, it, vi } from "vitest";
import {
  apiCalls,
  connectTestClient,
  envelopeFetch,
  fetchCall,
  resultText,
  TEST_TOKEN,
} from "#test/helpers/mcp-harness";

// Shift times come as UTC instants; the tool renders them in local time.
process.env.TZ = "Asia/Ho_Chi_Minh";

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

describe("biso24_list_my_work_shifts", () => {
  const officeShift = {
    workShiftCode: "CA_HC",
    workShiftName: "CA_HC (08:00 - 17:30)",
    workShiftItem: {
      code: "CA_HC",
      name: "Office hours",
      workingTimes: { workingTime: "2026-05-15T01:00:00.000Z" },
      endTimes: { endTime: "2026-05-15T10:30:00.000Z" },
      coefficients: { normalDay: 1, offDay: 2, holiday: 3 },
    },
  };

  /** Office shift on weekdays, none at weekends (null, as Biso24 answers). */
  function weekdayShifts() {
    return vi.fn<typeof fetch>(async (url) => {
      if (String(url).endsWith("/v1/auth/login")) return loginOk();
      const date = new URL(String(url)).searchParams.get("currentDate") ?? "";
      const day = new Date(`${date}T00:00:00Z`).getUTCDay();
      return envelope(day === 0 || day === 6 ? null : [officeShift]);
    });
  }

  it("calls the per-date endpoint once per day and keeps only days with a shift", async () => {
    const fetchMock = weekdayShifts();
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_list_my_work_shifts",
      arguments: { year: 2026, month: 2 },
    });

    const dates = apiCalls(fetchMock).map(([url]) =>
      new URL(String(url)).searchParams.get("currentDate"),
    );
    expect(dates.sort()).toEqual(
      Array.from(
        { length: 28 },
        (_, i) => `2026-02-${String(i + 1).padStart(2, "0")}`,
      ),
    );
    const { items } = result.structuredContent as { items: { date: string }[] };
    expect(items).toHaveLength(20);
    expect(items[0]).toEqual({
      date: "2026-02-02",
      code: "CA_HC",
      name: "Office hours",
      start: "08:00",
      end: "17:30",
    });
    expect(items.map((i) => i.date)).not.toContain("2026-02-01");
    expect(result.structuredContent).toMatchObject({ year: 2026, month: 2 });
  });

  it("defaults to the current month", async () => {
    const fetchMock = weekdayShifts();
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_list_my_work_shifts",
      arguments: {},
    });

    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`;
    const calls = apiCalls(fetchMock).map(([url]) =>
      new URL(String(url)).searchParams.get("currentDate"),
    );
    expect(calls.every((d) => d?.startsWith(prefix))).toBe(true);
    expect(calls).toHaveLength(
      new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
    );
    expect(result.structuredContent).toMatchObject({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    });
  });

  it("turns a failing day into a tool error", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (url) => {
      if (String(url).endsWith("/v1/auth/login")) return loginOk();
      const date = new URL(String(url)).searchParams.get("currentDate");
      return date === "2026-02-10"
        ? new Response(JSON.stringify({ success: false, data: null }), {
            status: 500,
          })
        : envelope([officeShift]);
    });
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_list_my_work_shifts",
      arguments: { year: 2026, month: 2 },
    });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toMatch(/500/);
  });

  it("rejects a month outside 1-12", async () => {
    const client = await connectTestClient(envelopeFetch(null));

    const result = await client.callTool({
      name: "biso24_list_my_work_shifts",
      arguments: { year: 2026, month: 13 },
    });

    expect(result.isError).toBe(true);
  });
});

function loginOk() {
  return new Response(
    JSON.stringify({ success: true, data: { token: TEST_TOKEN } }),
  );
}

function envelope(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }));
}
