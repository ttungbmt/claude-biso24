import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Biso24Client } from "#core/http/biso24-client";
import {
  DESTRUCTIVE,
  defineTool,
  READ_ONLY,
  WRITE,
} from "#core/mcp/define-tool";
import {
  pageMeta,
  paginate,
  paginationShape,
  toPageParams,
} from "#core/mcp/pagination";
import { localTime } from "../work-shifts/local-time";
import {
  getWorkShiftOnDate,
  type WorkShiftAssignment,
} from "../work-shifts/work-shifts.api";
import { summarizeRequest, typeNameIndex } from "./request-summary";
import {
  type ApproverCandidate,
  createRequest,
  deleteRequests,
  type EmployeeRequest,
  listApproverCandidates,
  listMyRequests,
  listRequestsToApprove,
  listRequestTypes,
  type RequestEmployeePage,
  type RequestType,
  submitRequest,
} from "./requests.api";

const ATTENDANCE_CORRECTION = "UPDATE_ATTENDANCE";

const correctionShape = {
  working_date: z.iso
    .date()
    .describe("The date whose timekeeping should be corrected, as YYYY-MM-DD."),
  work_shift_code: z
    .string()
    .optional()
    .describe(
      "Code of the Work shift on that date (e.g. CA_HC). Only needed when the date has " +
        "more than one shift.",
    ),
};

const timeOfDay = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm, e.g. 08:00");

const requestTypeCodeShape = {
  request_type_code: z
    .string()
    .optional()
    .describe(
      "Only requests of this type, by code (e.g. LEAVE, OVERTIME, UPDATE_ATTENDANCE); " +
        "codes come from biso24_list_request_types.",
    ),
};

export function registerRequestTools(
  server: McpServer,
  client: Biso24Client,
): void {
  defineTool(server, {
    name: "biso24_list_my_requests",
    title: "List my requests",
    description:
      "List requests (leave, attendance correction, overtime, business trip, shift change...) " +
      "filed by the logged-in employee (identified by the token), newest first, paginated. Each " +
      "item is a summary: id, type code/name, from/to dates the request applies to (plus per-day " +
      "parts for leave), status (NEW = draft not yet submitted, PROCESSING, APPROVED, REJECTED), " +
      "the current approval step, the next approver while one is awaited, note and creation time. " +
      "Also returns total_awaiting_my_approval: how many requests of OTHER employees await my " +
      "approval. To list those, use biso24_list_requests_to_approve. To see which request types " +
      "exist, use biso24_list_request_types.",
    inputSchema: {
      status: z
        .enum(["NEW", "PROCESSING", "APPROVED", "REJECTED"])
        .optional()
        .describe(
          "Only requests in this status: NEW = draft, PROCESSING = awaiting approval, " +
            "APPROVED, REJECTED.",
        ),
      ...requestTypeCodeShape,
      ...paginationShape,
    },
    annotations: READ_ONLY,
    handler: async ({ status, request_type_code, limit, offset }) => {
      const [result, types] = await Promise.all([
        listMyRequests(client, {
          status,
          requestCategoryCode: request_type_code,
          ...toPageParams({ limit, offset }),
        }),
        listRequestTypes(client),
      ]);
      return toListResult(result, types, { limit, offset });
    },
  });

  defineTool(server, {
    name: "biso24_list_requests_to_approve",
    title: "List requests awaiting my approval",
    description:
      "List requests of other employees that currently await the logged-in employee's approval " +
      '(the web app\'s "Đơn cần duyệt" tab), newest first, paginated. Use it for "how many ' +
      'requests do I need to approve?" (total) or "whose requests are waiting for me?". Only ' +
      "open requests: requests I already approved or rejected are not listed. Each item has the " +
      "same summary as biso24_list_my_requests plus the requester (name, staff code, department). " +
      "For requests I filed myself, use biso24_list_my_requests.",
    inputSchema: {
      ...requestTypeCodeShape,
      ...paginationShape,
    },
    annotations: READ_ONLY,
    handler: async ({ request_type_code, limit, offset }) => {
      const [result, types] = await Promise.all([
        listRequestsToApprove(client, {
          requestCategoryCode: request_type_code,
          ...toPageParams({ limit, offset }),
        }),
        listRequestTypes(client),
      ]);
      return toListResult(
        result,
        types,
        { limit, offset },
        { withRequester: true },
      );
    },
  });

  defineTool(server, {
    name: "biso24_delete_my_request",
    title: "Delete my draft request",
    description:
      "Permanently delete ONE draft request (status NEW, not yet submitted) filed by the " +
      "logged-in employee. Use only when the user explicitly asks to delete a specific draft; " +
      "get its id from biso24_list_my_requests (status NEW). Refuses submitted, approved or " +
      "rejected requests and other employees' requests. Returns a summary of the deleted request. " +
      "Cannot be undone.",
    inputSchema: {
      request_id: z
        .string()
        .min(1)
        .describe(
          "Id of the draft request to delete, from biso24_list_my_requests.",
        ),
    },
    annotations: DESTRUCTIVE,
    handler: async ({ request_id }) => {
      const [draft, types] = await Promise.all([
        findMyDraft(client, request_id),
        listRequestTypes(client),
      ]);
      if (!draft) {
        throw new Error(
          `Request ${request_id} is not one of the logged-in employee's draft (NEW) requests, ` +
            "so it was not deleted. Only own drafts can be deleted; submitted requests must be " +
            "cancelled in the Biso24 web app. Use biso24_list_my_requests with status NEW to " +
            "find deletable drafts.",
        );
      }
      await deleteRequests(client, [draft._id]);
      return { deleted: summarizeRequest(draft, typeNameIndex(types)) };
    },
  });

  defineTool(server, {
    name: "biso24_submit_my_request",
    title: "Submit my draft request for approval",
    description:
      "Submit ONE draft request (status NEW) filed by the logged-in employee for approval, " +
      'like the web app\'s "Gửi duyệt": its approval steps start and the approver is notified. ' +
      "Use only when the user asks to submit a specific draft, e.g. right after " +
      "biso24_create_my_attendance_correction; get its id from biso24_list_my_requests " +
      "(status NEW). Refuses requests that are already submitted and other employees' requests. " +
      "A submitted request can no longer be deleted, only cancelled in the Biso24 web app. " +
      "Returns a summary of the submitted request.",
    inputSchema: {
      request_id: z
        .string()
        .min(1)
        .describe(
          "Id of the draft request to submit, from biso24_list_my_requests.",
        ),
    },
    annotations: WRITE,
    handler: async ({ request_id }) => {
      const [draft, types] = await Promise.all([
        findMyDraft(client, request_id),
        listRequestTypes(client),
      ]);
      if (!draft) {
        throw new Error(
          `Request ${request_id} is not one of the logged-in employee's draft (NEW) requests, ` +
            "so it was not submitted. Only own drafts can be submitted. Use " +
            "biso24_list_my_requests with status NEW to find them.",
        );
      }
      const sent = await submitRequest(client, draft._id);
      // The response shape is unverified; fall back to the draft we looked up.
      const request = isRequest(sent) ? sent : draft;
      return { submitted: summarizeRequest(request, typeNameIndex(types)) };
    },
  });

  defineTool(server, {
    name: "biso24_list_attendance_correction_approvers",
    title: "List approvers for an attendance correction",
    description:
      'List the employees the logged-in employee may pick as approver ("Người tiếp nhận") ' +
      "of an attendance correction request for a date, plus that date's Work shift. Use it " +
      "before biso24_create_my_attendance_correction to find the approver's staff code, or to " +
      "check a name the user gave. Read-only.",
    inputSchema: correctionShape,
    annotations: READ_ONLY,
    handler: async ({ working_date, work_shift_code }) => {
      const { shift, requestType } = await correctionContext(
        client,
        working_date,
        work_shift_code,
      );
      const candidates = await listApproverCandidates(client, {
        requestTypeId: requestType._id,
        workShiftId: shift.id,
      });
      return {
        work_shift: shift.summary,
        approvers: candidates.map((c) => ({
          staff_code: c.staffCode,
          name: c.fullName,
          department: c.departmentName,
          position: c.positionName,
        })),
      };
    },
  });

  defineTool(server, {
    name: "biso24_create_my_attendance_correction",
    title: "Create my attendance correction draft",
    description:
      'Create an attendance correction request ("Đề nghị cập nhật chấm công") for the ' +
      "logged-in employee, saved as a DRAFT (status NEW): it is not submitted for approval; " +
      "submit it with biso24_submit_my_request once the user agrees. Use when the user asks to file or draft a " +
      "correction for a date, typically a forgotten check-in. Check-in/out times default to the " +
      "Work shift's start and end. Get the approver's staff code from " +
      "biso24_list_attendance_correction_approvers. Biso24 does not stop duplicates: check " +
      "biso24_list_my_requests for an existing request on that date first. Returns a summary of " +
      "the created draft.",
    inputSchema: {
      ...correctionShape,
      reason: z
        .string()
        .min(1)
        .describe(
          'Reason ("Lý do cập nhật"), in the user\'s words; the web app suggests ' +
            '"Quên chấm công", "Máy chấm công lỗi", "Mất điện", "Mất mạng".',
        ),
      approver_staff_code: z
        .string()
        .min(1)
        .describe(
          "Staff code of the approver, from biso24_list_attendance_correction_approvers.",
        ),
      time_in: timeOfDay
        .optional()
        .describe("Check-in time as HH:mm. Defaults to the Work shift start."),
      time_out: timeOfDay
        .optional()
        .describe("Check-out time as HH:mm. Defaults to the Work shift end."),
    },
    annotations: WRITE,
    handler: async (args) => {
      const { shift, requestType, types } = await correctionContext(
        client,
        args.working_date,
        args.work_shift_code,
      );
      const timeIn = args.time_in ?? shift.summary.start;
      const timeOut = args.time_out ?? shift.summary.end;
      if (!timeIn || !timeOut) {
        throw new Error(
          "The Work shift has no start or end time; pass time_in and time_out (HH:mm).",
        );
      }
      const candidates = await listApproverCandidates(client, {
        requestTypeId: requestType._id,
        workShiftId: shift.id,
      });
      const approver = findApprover(candidates, args.approver_staff_code);
      const created = await createRequest(client, {
        registrationDate: new Date().toISOString(),
        requestCategoryId: requestType._id,
        requestCategoryCode: ATTENDANCE_CORRECTION,
        requestData: {
          workingDate: args.working_date,
          workShiftItem: {
            code: shift.summary.code,
            workShiftItemId: shift.id,
            name: shift.displayName,
          },
          timeIn: `${timeIn}:00`,
          timeOut: `${timeOut}:00`,
        },
        notes: args.reason,
        files: [],
        approvalForNextStep: approver,
      });
      return {
        created: summarizeRequest(created, typeNameIndex(types)),
        work_shift: shift.summary,
        time_in: timeIn,
        time_out: timeOut,
        approver: { name: approver.fullName, staff_code: approver.staffCode },
      };
    },
  });

  defineTool(server, {
    name: "biso24_list_request_types",
    title: "List request types",
    description:
      "List the request types (leave, overtime, business trip, shift change...) configured for " +
      "the organization. Each type's _id identifies it in requests. Use to interpret or pick a " +
      "request type; for the requests themselves use biso24_list_my_requests.",
    inputSchema: paginationShape,
    annotations: READ_ONLY,
    handler: async (page) => paginate(await listRequestTypes(client), page),
  });
}

/**
 * What filing an Attendance correction for a date needs: that date's single
 * Work shift (or the one with `shiftCode`) and the Attendance correction type.
 */
async function correctionContext(
  client: Biso24Client,
  date: string,
  shiftCode: string | undefined,
) {
  const [shifts, types] = await Promise.all([
    getWorkShiftOnDate(client, { date }),
    listRequestTypes(client),
  ]);
  const requestType = types.find((t) => t.code === ATTENDANCE_CORRECTION);
  if (!requestType) {
    throw new Error(
      `The organization has no ${ATTENDANCE_CORRECTION} request type (see biso24_list_request_types).`,
    );
  }
  return {
    shift: pickShift(shifts ?? [], date, shiftCode),
    requestType,
    types,
  };
}

function pickShift(
  shifts: WorkShiftAssignment[],
  date: string,
  shiftCode: string | undefined,
) {
  const codeOf = (s: WorkShiftAssignment) =>
    s.workShiftItem?.code ?? s.workShiftCode;
  const matches = shiftCode
    ? shifts.filter((s) => codeOf(s) === shiftCode)
    : shifts;
  const codes = shifts.map(codeOf).join(", ");
  if (matches.length === 0) {
    throw new Error(
      shiftCode
        ? `No Work shift ${shiftCode} on ${date}; shifts that day: ${codes || "none"}.`
        : `No Work shift on ${date}, so there is no timekeeping to correct. Check the date.`,
    );
  }
  const [shift] = matches;
  if (matches.length > 1 || !shift) {
    throw new Error(
      `${date} has several Work shifts (${codes}); pass work_shift_code to pick one.`,
    );
  }
  if (!shift.workShiftId) {
    throw new Error(
      `The Work shift on ${date} has no id; file it in the web app.`,
    );
  }
  return {
    id: shift.workShiftId,
    /** The label the web app stores, e.g. "CA_HC (08:00 - 17:30)". */
    displayName: shift.workShiftName ?? shift.workShiftItem?.name,
    summary: {
      code: codeOf(shift),
      name: shift.workShiftItem?.name ?? shift.workShiftName,
      start: localTime(shift.workShiftItem?.workingTimes?.workingTime),
      end: localTime(shift.workShiftItem?.endTimes?.endTime),
    },
  };
}

function findApprover(
  candidates: ApproverCandidate[],
  staffCode: string,
): ApproverCandidate {
  const approver = candidates.find((c) => c.staffCode === staffCode);
  if (!approver) {
    throw new Error(
      `Staff code ${staffCode} is not among the allowed approvers. Use ` +
        "biso24_list_attendance_correction_approvers to find a valid staff code.",
    );
  }
  return approver;
}

/**
 * The logged-in employee's draft with this id, looked up among their own NEW
 * Requests: this checks both ownership and status (ADR 0005).
 */
async function findMyDraft(
  client: Biso24Client,
  id: string,
): Promise<EmployeeRequest | undefined> {
  const limit = 100;
  for (let page = 1; ; page++) {
    const result = await listMyRequests(client, { status: "NEW", page, limit });
    const draft = result.data.find((r) => r._id === id);
    if (draft || page >= result.totalPages || result.data.length === 0) {
      return draft;
    }
  }
}

function isRequest(value: unknown): value is EmployeeRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { _id?: unknown })._id === "string"
  );
}

function toListResult(
  result: RequestEmployeePage,
  types: RequestType[],
  page: { limit: number; offset: number },
  options?: { withRequester?: boolean },
) {
  const typeNames = typeNameIndex(types);
  return {
    items: result.data.map((r) => summarizeRequest(r, typeNames, options)),
    ...pageMeta(page, result.data.length, result.total),
    total_awaiting_my_approval: result.totalPendingApproval,
  };
}
