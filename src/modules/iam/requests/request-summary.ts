import type { EmployeeRequest, RequestType } from "./requests.api";

/** What biso24_list_my_requests returns per Request (the raw one is ~5 KB). */
export interface RequestSummary {
  id: string;
  type: { code?: string; name?: string };
  /** First and last date the Request applies to (YYYY-MM-DD). */
  from?: string;
  to?: string;
  /** Per-day detail of a leave Request; `part` is e.g. ALL_DAY or NOON_SHIFT. */
  days?: { date: string; part?: string }[];
  status?: string;
  current_step?: { title?: string; status?: string };
  /** Only while the Request still waits on someone. */
  next_approver?: { name?: string; staff_code?: string };
  note?: string;
  created_at?: string;
}

/** Step statuses that mean the Request is still open at that step. */
const OPEN_STEP_STATUSES = new Set(["NEW", "WAITING_FOR_APPROVAL"]);
/** Step statuses of steps that are done or not reached yet. */
const PASSED_OR_PENDING = new Set(["SENT", "APPROVED", "NOT_STARTED"]);

export function summarizeRequest(
  request: EmployeeRequest,
  typeNames: Map<string, string>,
): RequestSummary {
  const data = request.requestData ?? {};
  const step = request.approvalSteps?.find(
    (s) => !PASSED_OR_PENDING.has(s.status ?? ""),
  );
  const approver = request.approvalForNextStep;
  const days = data.leaveDayDetails?.map((d) => ({
    date: fromDayMonthYear(d.day),
    part: d.option,
  }));

  return {
    id: request._id,
    type: {
      code: request.requestCategoryCode,
      name: typeNames.get(request.requestCategoryId ?? ""),
    },
    from: data.from ?? data.workingDate,
    to: data.to ?? data.workingDate,
    ...(days?.length ? { days } : {}),
    status: request.status,
    ...(step
      ? { current_step: { title: step.stepTitle, status: step.status } }
      : {}),
    ...(approver && step && OPEN_STEP_STATUSES.has(step.status ?? "")
      ? {
          next_approver: {
            name: approver.fullName,
            staff_code: approver.staffCode,
          },
        }
      : {}),
    note: request.notes,
    created_at: request.createdAt,
  };
}

/** Request type id → display name. */
export function typeNameIndex(types: RequestType[]): Map<string, string> {
  return new Map(types.map((t) => [t._id, t.title ?? t.code ?? ""]));
}

/** "07/08/2026" → "2026-08-07"; anything else is returned unchanged. */
function fromDayMonthYear(day: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(day);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : day;
}
