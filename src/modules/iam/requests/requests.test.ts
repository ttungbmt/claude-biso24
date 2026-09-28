import { describe, expect, it } from "vitest";
import {
  apiCalls,
  connectTestClient,
  envelopeFetch,
  fetchCall,
  resultText,
  routeFetch,
} from "#test/helpers/mcp-harness";

const conditions = [
  {
    if: [{ conditionType: "DEPARTMENT", value: ["dept-1", "dept-2"] }],
  },
];

const requestTypes = [
  {
    _id: "cat-attendance",
    code: "UPDATE_ATTENDANCE",
    title: "Attendance correction",
  },
  { _id: "cat-leave", code: "LEAVE", title: "Leave" },
];

const nextApprover = {
  employeeId: "e6",
  staffCode: "006",
  fullName: "Manager One",
  companyEmail: "",
};

/** Not yet submitted: the first step is still NEW. */
const attendanceDraft = {
  _id: "r1",
  orgIds: ["org1"],
  requestCategoryId: "cat-attendance",
  requestCategoryCode: "UPDATE_ATTENDANCE",
  employeeDetail: { staffCode: "043", fullName: "Me" },
  approvalSteps: [
    { stepIndex: 1, stepTitle: "Create", status: "NEW", conditions },
    {
      stepIndex: 2,
      stepTitle: "Direct manager",
      status: "NOT_STARTED",
      conditions: [],
    },
  ],
  requestData: {
    workingDate: "2026-09-23",
    workShiftItem: { name: "Office hours", code: "CA_HC" },
    timeIn: "08:00:00",
    timeOut: "17:30:00",
  },
  notes: "Forgot to check in",
  status: "NEW",
  approvalForNextStep: nextApprover,
  createdAt: "2026-09-28T05:01:43.756Z",
};

/** Biso24 keeps approvalForNextStep on finished requests; it must not show. */
const rejectedLeave = {
  _id: "r2",
  orgIds: ["org1"],
  requestCategoryId: "cat-leave",
  requestCategoryCode: "LEAVE",
  approvalSteps: [
    { stepIndex: 1, stepTitle: "Create", status: "SENT", conditions },
    {
      stepIndex: 2,
      stepTitle: "Direct manager",
      status: "REJECTED",
      conditions: [],
    },
    { stepIndex: 3, stepTitle: "Head", status: "NOT_STARTED", conditions: [] },
  ],
  requestData: {
    from: "2026-08-06",
    to: "2026-08-07",
    leaveDayDetails: [
      { day: "06/08/2026", option: "ALL_DAY" },
      { day: "07/08/2026", option: "NOON_SHIFT" },
    ],
    leaveTypeName: "Annual leave",
  },
  notes: "",
  status: "REJECTED",
  approvalForNextStep: nextApprover,
  createdAt: "2026-08-01T02:00:00.000Z",
};

describe("request tools", () => {
  it("biso24_list_my_requests returns a trimmed summary of each request", async () => {
    const fetchMock = routeFetch({
      "/v1/request-employees": {
        data: [attendanceDraft, rejectedLeave],
        total: 2,
        limit: 20,
        page: 1,
        totalPages: 1,
        totalPendingApproval: 1,
      },
      "/v1/request-managements": requestTypes,
    });
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_list_my_requests",
      arguments: {},
    });

    expect(result.structuredContent).toEqual({
      items: [
        {
          id: "r1",
          type: { code: "UPDATE_ATTENDANCE", name: "Attendance correction" },
          from: "2026-09-23",
          to: "2026-09-23",
          status: "NEW",
          current_step: { title: "Create", status: "NEW" },
          next_approver: { name: "Manager One", staff_code: "006" },
          note: "Forgot to check in",
          created_at: "2026-09-28T05:01:43.756Z",
        },
        {
          id: "r2",
          type: { code: "LEAVE", name: "Leave" },
          from: "2026-08-06",
          to: "2026-08-07",
          days: [
            { date: "2026-08-06", part: "ALL_DAY" },
            { date: "2026-08-07", part: "NOON_SHIFT" },
          ],
          status: "REJECTED",
          current_step: { title: "Direct manager", status: "REJECTED" },
          note: "",
          created_at: "2026-08-01T02:00:00.000Z",
        },
      ],
      total: 2,
      count: 2,
      offset: 0,
      has_more: false,
      total_pending_approval: 1,
    });
    expect(resultText(result)).not.toMatch(/conditions|orgIds|dept-/);
  });

  it("biso24_list_my_requests maps offset to page and reports has_more", async () => {
    const fetchMock = routeFetch({
      "/v1/request-employees": {
        data: [attendanceDraft, rejectedLeave],
        total: 5,
        limit: 2,
        page: 2,
        totalPages: 3,
        totalPendingApproval: 1,
      },
      "/v1/request-managements": requestTypes,
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
    expect(result.structuredContent).toMatchObject({
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
