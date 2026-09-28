import type { Biso24Client } from "#core/http/biso24-client";

/** One Work shift assignment as returned by the per-date endpoint (fields we read). */
export interface WorkShiftAssignment {
  workShiftCode?: string;
  workShiftName?: string;
  workShiftItem?: {
    code?: string;
    name?: string;
    /** `workingTime` is the start time, as an instant on an arbitrary date. */
    workingTimes?: { workingTime?: string };
    /** `endTime` is the end time, as an instant on an arbitrary date. */
    endTimes?: { endTime?: string };
  };
}

/**
 * Work shift(s) of the logged-in employee on a date (YYYY-MM-DD); null when
 * the employee has no shift that day (e.g. weekends).
 */
export function getWorkShiftOnDate(
  client: Biso24Client,
  { date }: { date: string },
): Promise<WorkShiftAssignment[] | null> {
  return client.get("v1/work-shift-employees/work-shift-current-date", {
    currentDate: date,
  });
}
