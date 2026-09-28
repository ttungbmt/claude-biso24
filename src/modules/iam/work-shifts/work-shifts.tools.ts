import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Biso24Client } from "#core/http/biso24-client";
import { defineTool, READ_ONLY } from "#core/mcp/define-tool";
import {
  getWorkShiftOnDate,
  type WorkShiftAssignment,
} from "./work-shifts.api";

/** Max per-date requests in flight when listing a month. */
const MONTH_CONCURRENCY = 5;

export function registerWorkShiftTools(
  server: McpServer,
  client: Biso24Client,
): void {
  defineTool(server, {
    name: "biso24_get_my_work_shift",
    title: "Get my work shift on a date",
    description:
      "Get the work shift (start/end time) assigned to the logged-in employee (identified by " +
      "the token) on one date. For actual check-in/out records use biso24_get_my_timekeeping.",
    inputSchema: {
      date: z.iso
        .date()
        .optional()
        .describe("Date as YYYY-MM-DD. Defaults to today (server local time)."),
    },
    annotations: READ_ONLY,
    handler: ({ date }) =>
      getWorkShiftOnDate(client, { date: date ?? today() }),
  });

  defineTool(server, {
    name: "biso24_list_my_work_shifts",
    title: "List my work shifts for a month",
    description:
      "List the work shifts assigned to the logged-in employee (identified by the token) for " +
      "every date of one month: date, shift code, shift name, start and end time (HH:mm, local " +
      "time). Dates without a shift (e.g. weekends) are left out; public holidays may still " +
      "show a shift. Use for month-level questions; for a single date use " +
      "biso24_get_my_work_shift, for actual check-in/out records biso24_get_my_timekeeping.",
    inputSchema: {
      year: z
        .number()
        .int()
        .min(2000)
        .max(2100)
        .optional()
        .describe("4-digit year. Defaults to the current year."),
      month: z
        .number()
        .int()
        .min(1)
        .max(12)
        .optional()
        .describe("Month 1-12. Defaults to the current month."),
    },
    annotations: READ_ONLY,
    handler: async (args) => {
      const now = new Date();
      const year = args.year ?? now.getFullYear();
      const month = args.month ?? now.getMonth() + 1;
      const days = await mapWithConcurrency(
        datesOfMonth(year, month),
        MONTH_CONCURRENCY,
        async (date) =>
          (await getWorkShiftOnDate(client, { date }))?.map((shift) =>
            summarizeShift(date, shift),
          ) ?? [],
      );
      return { year, month, items: days.flat() };
    },
  });
}

function summarizeShift(date: string, shift: WorkShiftAssignment) {
  const item = shift.workShiftItem;
  return {
    date,
    code: item?.code ?? shift.workShiftCode,
    name: item?.name ?? shift.workShiftName,
    start: localTime(item?.workingTimes?.workingTime),
    end: localTime(item?.endTimes?.endTime),
  };
}

/** An ISO instant's time of day as HH:mm in the server's local time zone. */
function localTime(instant: string | undefined): string | undefined {
  if (!instant) return undefined;
  const time = new Date(instant);
  return `${pad(time.getHours())}:${pad(time.getMinutes())}`;
}

/** Every date of the month as YYYY-MM-DD. */
function datesOfMonth(year: number, month: number): string[] {
  const length = new Date(year, month, 0).getDate();
  return Array.from(
    { length },
    (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`,
  );
}

/** Like Promise.all over items.map(fn), with at most `limit` calls in flight. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i] as T);
    }
  };
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

/** Today's date as YYYY-MM-DD in the server's local time zone. */
function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const pad = (n: number) => String(n).padStart(2, "0");
