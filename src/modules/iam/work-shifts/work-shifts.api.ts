import type { Biso24Client } from "#core/http/biso24-client";

/** Work shift of the logged-in employee on a date (YYYY-MM-DD). */
export function getWorkShiftOnDate(
  client: Biso24Client,
  { date }: { date: string },
): Promise<unknown> {
  return client.get("v1/work-shift-employees/work-shift-current-date", {
    currentDate: date,
  });
}
