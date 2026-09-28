import type { Biso24Client } from "#core/http/biso24-client";

/** Timekeeping data of the logged-in employee for one month. */
export function getPersonalTimekeeping(
  client: Biso24Client,
  { month, year }: { month: number; year: number },
): Promise<unknown> {
  return client.get("v1/timekeeping-employees/personal-data", {
    month: String(month).padStart(2, "0"),
    year,
  });
}

/** Yearly timekeeping summary of the logged-in employee. */
export function getTimekeepingDashboard(
  client: Biso24Client,
  { year }: { year: number },
): Promise<unknown> {
  return client.get("v1/timekeeping-employees/dashboard", { year });
}
