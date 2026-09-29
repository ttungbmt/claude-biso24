import { describe, expect, it, vi } from "vitest";
import {
  apiCalls,
  connectTestClient,
  envelopeFetch,
  fetchCall,
  resultText,
  routeFetch,
} from "#test/helpers/mcp-harness";

// Work shift times are instants; the tools print them in local time.
process.env.TZ = "Asia/Ho_Chi_Minh";

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
      total_awaiting_my_approval: 1,
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
      total_awaiting_my_approval: 1,
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

  it("biso24_list_my_requests passes the status and request type filters", async () => {
    const fetchMock = routeFetch({
      "/v1/request-employees": {
        data: [],
        total: 0,
        limit: 20,
        page: 1,
        totalPages: 0,
        totalPendingApproval: 0,
      },
      "/v1/request-managements": requestTypes,
    });
    const client = await connectTestClient(fetchMock);

    await client.callTool({
      name: "biso24_list_my_requests",
      arguments: { status: "PROCESSING", request_type_code: "LEAVE" },
    });

    const { url } = fetchCall(fetchMock);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      type: "OWNER",
      page: "1",
      limit: "20",
      status: "PROCESSING",
      requestCategoryCode: "LEAVE",
    });
  });

  it("biso24_list_requests_to_approve lists requests awaiting my approval with their requester", async () => {
    const awaitingMe = {
      ...rejectedLeave,
      _id: "r3",
      employeeDetail: {
        staffCode: "077",
        fullName: "Team Member",
        departmentName: "Engineering",
      },
      approvalSteps: [
        { stepIndex: 1, stepTitle: "Create", status: "SENT", conditions },
        {
          stepIndex: 2,
          stepTitle: "Direct manager",
          status: "WAITING_FOR_APPROVAL",
          conditions: [],
        },
      ],
      status: "PROCESSING",
      notes: "Family trip",
    };
    const fetchMock = routeFetch({
      "/v1/request-employees": {
        data: [awaitingMe],
        total: 1,
        limit: 20,
        page: 1,
        totalPages: 1,
        totalPendingApproval: 1,
      },
      "/v1/request-managements": requestTypes,
    });
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_list_requests_to_approve",
      arguments: { request_type_code: "LEAVE" },
    });

    const { url } = fetchCall(fetchMock);
    expect(url.pathname).toBe("/v1/request-employees");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      type: "RESPONSIBLE",
      page: "1",
      limit: "20",
      requestCategoryCode: "LEAVE",
    });
    expect(result.structuredContent).toEqual({
      items: [
        {
          id: "r3",
          type: { code: "LEAVE", name: "Leave" },
          requester: {
            name: "Team Member",
            staff_code: "077",
            department: "Engineering",
          },
          from: "2026-08-06",
          to: "2026-08-07",
          days: [
            { date: "2026-08-06", part: "ALL_DAY" },
            { date: "2026-08-07", part: "NOON_SHIFT" },
          ],
          status: "PROCESSING",
          current_step: {
            title: "Direct manager",
            status: "WAITING_FOR_APPROVAL",
          },
          next_approver: { name: "Manager One", staff_code: "006" },
          note: "Family trip",
          created_at: "2026-08-01T02:00:00.000Z",
        },
      ],
      total: 1,
      count: 1,
      offset: 0,
      has_more: false,
      total_awaiting_my_approval: 1,
    });
  });

  const draftPage = (data: unknown[], page = 1, totalPages = 1) => ({
    data,
    total: data.length,
    limit: 100,
    page,
    totalPages,
    totalPendingApproval: 0,
  });

  it("biso24_delete_my_request deletes one of my drafts and returns its summary", async () => {
    const fetchMock = routeFetch({
      "GET /v1/request-employees": draftPage([attendanceDraft]),
      "DELETE /v1/request-employees": null,
      "/v1/request-managements": requestTypes,
    });
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_delete_my_request",
      arguments: { request_id: "r1" },
    });

    const lookup = fetchCall(fetchMock);
    expect(Object.fromEntries(lookup.url.searchParams)).toEqual({
      type: "OWNER",
      status: "NEW",
      page: "1",
      limit: "100",
    });
    const deletion = apiCalls(fetchMock)
      .map((_, n) => fetchCall(fetchMock, n))
      .filter((call) => call.method === "DELETE");
    expect(deletion).toHaveLength(1);
    expect(deletion[0]?.url.pathname).toBe("/v1/request-employees");
    expect(deletion[0]?.body).toBe(JSON.stringify(["r1"]));
    expect(result.structuredContent).toMatchObject({
      deleted: {
        id: "r1",
        type: { code: "UPDATE_ATTENDANCE", name: "Attendance correction" },
        from: "2026-09-23",
        status: "NEW",
      },
    });
  });

  it("biso24_delete_my_request looks through every page of my drafts", async () => {
    const pages = [
      draftPage([{ ...attendanceDraft, _id: "other" }], 1, 2),
      draftPage([attendanceDraft], 2, 2),
    ];
    const otherRoutes = routeFetch({
      "DELETE /v1/request-employees": null,
      "/v1/request-managements": requestTypes,
    });
    const fetchMock = vi.fn<typeof fetch>(async (url, init) => {
      const { pathname, searchParams } = new URL(String(url));
      if (pathname !== "/v1/request-employees" || init?.method !== "GET") {
        return otherRoutes(url, init);
      }
      const data = pages[Number(searchParams.get("page")) - 1];
      return new Response(JSON.stringify({ success: true, data }));
    });
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_delete_my_request",
      arguments: { request_id: "r1" },
    });

    expect(result.isError).toBeFalsy();
    const calls = apiCalls(fetchMock).map((_, n) => fetchCall(fetchMock, n));
    expect(
      calls
        .filter((c) => c.url.pathname === "/v1/request-employees")
        .map((c) => `${c.method} ${c.url.searchParams.get("page") ?? ""}`),
    ).toEqual(["GET 1", "GET 2", "DELETE "]);
  });

  it("biso24_delete_my_request refuses a request that is not one of my drafts", async () => {
    const fetchMock = routeFetch({
      "GET /v1/request-employees": draftPage([attendanceDraft]),
      "/v1/request-managements": requestTypes,
    });
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_delete_my_request",
      arguments: { request_id: "someone-elses-or-submitted" },
    });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toMatch(/not one of .* draft \(NEW\) requests/);
    expect(
      apiCalls(fetchMock).filter(([, init]) => init?.method === "DELETE"),
    ).toHaveLength(0);
  });

  it("biso24_delete_my_request is annotated as destructive", async () => {
    const client = await connectTestClient(envelopeFetch(null));

    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === "biso24_delete_my_request");

    expect(tool?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
    });
  });

  const submitPath = "PUT /v1/request-employees/r1/send-request";
  const submitted = {
    ...attendanceDraft,
    status: "PROCESSING",
    approvalSteps: [
      { stepIndex: 1, stepTitle: "Create", status: "SENT", conditions },
      {
        stepIndex: 2,
        stepTitle: "Direct manager",
        status: "WAITING_FOR_APPROVAL",
        conditions: [],
      },
    ],
  };

  it("biso24_submit_my_request submits one of my drafts for approval", async () => {
    const fetchMock = routeFetch({
      "GET /v1/request-employees": draftPage([attendanceDraft]),
      [submitPath]: submitted,
      "/v1/request-managements": requestTypes,
    });
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_submit_my_request",
      arguments: { request_id: "r1" },
    });

    const lookup = fetchCall(fetchMock);
    expect(Object.fromEntries(lookup.url.searchParams)).toMatchObject({
      type: "OWNER",
      status: "NEW",
    });
    const sends = apiCalls(fetchMock)
      .map((_, n) => fetchCall(fetchMock, n))
      .filter((call) => call.method === "PUT");
    expect(sends).toHaveLength(1);
    expect(sends[0]?.url.pathname).toBe(
      "/v1/request-employees/r1/send-request",
    );
    expect(sends[0]?.body).toBeUndefined();
    expect(result.structuredContent).toMatchObject({
      submitted: {
        id: "r1",
        type: { code: "UPDATE_ATTENDANCE", name: "Attendance correction" },
        from: "2026-09-23",
        status: "PROCESSING",
        next_approver: { name: "Manager One", staff_code: "006" },
      },
    });
  });

  it("biso24_submit_my_request falls back to the draft when the API returns no request", async () => {
    const fetchMock = routeFetch({
      "GET /v1/request-employees": draftPage([attendanceDraft]),
      [submitPath]: null,
      "/v1/request-managements": requestTypes,
    });
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_submit_my_request",
      arguments: { request_id: "r1" },
    });

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({
      submitted: { id: "r1", from: "2026-09-23" },
    });
  });

  it("biso24_submit_my_request refuses a request that is not one of my drafts", async () => {
    const fetchMock = routeFetch({
      "GET /v1/request-employees": draftPage([attendanceDraft]),
      "/v1/request-managements": requestTypes,
    });
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_submit_my_request",
      arguments: { request_id: "someone-elses-or-submitted" },
    });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toMatch(/not one of .* draft \(NEW\) requests/);
    expect(
      apiCalls(fetchMock).filter(([, init]) => init?.method === "PUT"),
    ).toHaveLength(0);
  });

  it("biso24_submit_my_request is annotated as a non-destructive write", async () => {
    const client = await connectTestClient(envelopeFetch(null));

    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === "biso24_submit_my_request");

    expect(tool?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
    });
  });

  const officeShift = {
    workShiftId: "shift-hc",
    workShiftCode: "CA_HC",
    workShiftName: "CA_HC (08:00 - 17:30)",
    workShiftItem: {
      _id: "shift-hc",
      code: "CA_HC",
      name: "Office hours",
      workingTimes: { workingTime: "2026-05-15T01:00:00.000Z" },
      endTimes: { endTime: "2026-05-15T10:30:00.000Z" },
    },
  };
  const candidates = [
    {
      employeeId: "e5",
      staffCode: "005",
      fullName: "Other Lead",
      departmentName: "Mobile",
      positionName: "Lead",
    },
    {
      employeeId: "e6",
      staffCode: "006",
      fullName: "Manager One",
      avatar: "",
      personalEmail: "",
      companyEmail: "",
      departmentName: "Software",
      positionName: "Deputy head",
    },
  ];
  const approversPath =
    "POST /v1/request-employees/cat-attendance/approve-details-for-next-steps";
  const shiftPath = "/v1/work-shift-employees/work-shift-current-date";

  it("biso24_list_attendance_correction_approvers lists approvers for the date's shift", async () => {
    const fetchMock = routeFetch({
      [shiftPath]: [officeShift],
      "/v1/request-managements": requestTypes,
      [approversPath]: candidates,
    });
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_list_attendance_correction_approvers",
      arguments: { working_date: "2026-09-24" },
    });

    const calls = apiCalls(fetchMock).map((_, n) => fetchCall(fetchMock, n));
    const shiftCall = calls.find((c) => c.url.pathname === shiftPath);
    expect(shiftCall?.url.searchParams.get("currentDate")).toBe("2026-09-24");
    const approversCall = calls.find((c) => c.method === "POST");
    expect(approversCall?.body).toBe(JSON.stringify({ workShift: "shift-hc" }));
    expect(result.structuredContent).toEqual({
      work_shift: {
        code: "CA_HC",
        name: "Office hours",
        start: "08:00",
        end: "17:30",
      },
      approvers: [
        {
          staff_code: "005",
          name: "Other Lead",
          department: "Mobile",
          position: "Lead",
        },
        {
          staff_code: "006",
          name: "Manager One",
          department: "Software",
          position: "Deputy head",
        },
      ],
    });
  });

  it("biso24_create_my_attendance_correction saves a draft with the shift's times", async () => {
    const fetchMock = routeFetch({
      [shiftPath]: [officeShift],
      "/v1/request-managements": requestTypes,
      [approversPath]: candidates,
      "POST /v1/request-employees": {
        ...attendanceDraft,
        requestData: {
          ...attendanceDraft.requestData,
          workingDate: "2026-09-24",
        },
      },
    });
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_create_my_attendance_correction",
      arguments: {
        working_date: "2026-09-24",
        reason: "Quên chấm công",
        approver_staff_code: "006",
      },
    });

    const create = apiCalls(fetchMock)
      .map((_, n) => fetchCall(fetchMock, n))
      .find(
        (c) =>
          c.method === "POST" && c.url.pathname === "/v1/request-employees",
      );
    const body = JSON.parse(String(create?.body));
    expect(body).toEqual({
      registrationDate: expect.any(String),
      requestCategoryId: "cat-attendance",
      requestCategoryCode: "UPDATE_ATTENDANCE",
      requestData: {
        workingDate: "2026-09-24",
        workShiftItem: {
          code: "CA_HC",
          workShiftItemId: "shift-hc",
          name: "CA_HC (08:00 - 17:30)",
        },
        timeIn: "08:00:00",
        timeOut: "17:30:00",
      },
      notes: "Quên chấm công",
      files: [],
      approvalForNextStep: candidates[1],
    });
    expect(result.structuredContent).toMatchObject({
      created: { id: "r1", status: "NEW", from: "2026-09-24" },
      time_in: "08:00",
      time_out: "17:30",
      approver: { name: "Manager One", staff_code: "006" },
    });
  });

  it("biso24_create_my_attendance_correction uses the given times", async () => {
    const fetchMock = routeFetch({
      [shiftPath]: [officeShift],
      "/v1/request-managements": requestTypes,
      [approversPath]: candidates,
      "POST /v1/request-employees": attendanceDraft,
    });
    const client = await connectTestClient(fetchMock);

    await client.callTool({
      name: "biso24_create_my_attendance_correction",
      arguments: {
        working_date: "2026-09-24",
        reason: "Mất điện",
        approver_staff_code: "006",
        time_in: "08:15",
        time_out: "12:00",
      },
    });

    const create = apiCalls(fetchMock)
      .map((_, n) => fetchCall(fetchMock, n))
      .find(
        (c) =>
          c.method === "POST" && c.url.pathname === "/v1/request-employees",
      );
    expect(JSON.parse(String(create?.body)).requestData).toMatchObject({
      timeIn: "08:15:00",
      timeOut: "12:00:00",
    });
  });

  it("biso24_create_my_attendance_correction refuses an approver outside the list", async () => {
    const fetchMock = routeFetch({
      [shiftPath]: [officeShift],
      "/v1/request-managements": requestTypes,
      [approversPath]: candidates,
    });
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_create_my_attendance_correction",
      arguments: {
        working_date: "2026-09-24",
        reason: "Quên chấm công",
        approver_staff_code: "999",
      },
    });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toMatch(
      /999 is not among the allowed approvers/,
    );
    const posts = apiCalls(fetchMock)
      .map((_, n) => fetchCall(fetchMock, n))
      .filter((c) => c.url.pathname === "/v1/request-employees");
    expect(posts).toHaveLength(0);
  });

  it("biso24_create_my_attendance_correction refuses a date without a shift", async () => {
    const fetchMock = routeFetch({
      [shiftPath]: null,
      "/v1/request-managements": requestTypes,
    });
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_create_my_attendance_correction",
      arguments: {
        working_date: "2026-09-27",
        reason: "Quên chấm công",
        approver_staff_code: "006",
      },
    });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toMatch(/No Work shift on 2026-09-27/);
  });

  it("biso24_create_my_attendance_correction asks for a shift code when a date has several", async () => {
    const fetchMock = routeFetch({
      [shiftPath]: [
        officeShift,
        {
          ...officeShift,
          workShiftId: "shift-n",
          workShiftCode: "CA_N",
          workShiftItem: { ...officeShift.workShiftItem, code: "CA_N" },
        },
      ],
      "/v1/request-managements": requestTypes,
    });
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_create_my_attendance_correction",
      arguments: {
        working_date: "2026-09-24",
        reason: "Quên chấm công",
        approver_staff_code: "006",
      },
    });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toMatch(/several Work shifts \(CA_HC, CA_N\)/);
  });

  const person = (staffCode: string, fullName: string) => ({
    employeeId: `emp-${staffCode}`,
    staffCode,
    fullName,
    avatar: "",
    companyEmail: "",
    departmentName: "Software",
    positionName: "Manager",
    _id: `sub-${staffCode}`,
  });

  /** A leave request awaiting my approval at step 2, then forwarded to `next`. */
  const awaitingMyApproval = (id: string, next: unknown[] | null) => ({
    ...rejectedLeave,
    _id: id,
    employeeDetail: { staffCode: "089", fullName: "Team Member" },
    approvalSteps: [
      { stepIndex: 1, stepTitle: "Create", status: "SENT", conditions },
      {
        stepIndex: 2,
        stepTitle: "Direct manager",
        status: "WAITING_FOR_APPROVAL",
        approvers: [person("043", "Me")],
        conditions: [],
      },
      ...(next
        ? [
            {
              stepIndex: 3,
              stepTitle: "Deputy head",
              status: "NOT_STARTED",
              approvers: next,
              conditions: [],
            },
          ]
        : []),
    ],
    status: "PROCESSING",
    approvalForNextStep: person("043", "Me"),
  });

  const approvalRoutes = (data: unknown[]) =>
    routeFetch({
      "GET /v1/request-employees": draftPage(data),
      "POST /v1/request-employees/multiple-approvals": null,
      "/v1/request-managements": requestTypes,
    });

  const approvalPosts = (fetchMock: ReturnType<typeof routeFetch>) =>
    apiCalls(fetchMock)
      .map((_, n) => fetchCall(fetchMock, n))
      .filter((c) => c.url.pathname.endsWith("/multiple-approvals"));

  it("biso24_approve_requests forwards each request to its next step's approver", async () => {
    const fetchMock = approvalRoutes([
      awaitingMyApproval("a1", [person("006", "Deputy One")]),
      awaitingMyApproval("a2", [person("007", "Deputy Two")]),
      awaitingMyApproval("a3", [person("006", "Deputy One")]),
    ]);
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_approve_requests",
      arguments: { request_ids: ["a1", "a2", "a1"] },
    });

    const lookup = fetchCall(fetchMock);
    expect(Object.fromEntries(lookup.url.searchParams)).toEqual({
      type: "RESPONSIBLE",
      page: "1",
      limit: "100",
    });
    const posts = approvalPosts(fetchMock);
    expect(posts).toHaveLength(1);
    expect(posts[0]?.method).toBe("POST");
    expect(JSON.parse(String(posts[0]?.body))).toEqual([
      {
        _id: "a1",
        approvalForNextStep: {
          employeeId: "emp-006",
          staffCode: "006",
          fullName: "Deputy One",
          departmentName: "Software",
          positionName: "Manager",
        },
      },
      {
        _id: "a2",
        approvalForNextStep: {
          employeeId: "emp-007",
          staffCode: "007",
          fullName: "Deputy Two",
          departmentName: "Software",
          positionName: "Manager",
        },
      },
    ]);
    expect(result.structuredContent).toMatchObject({
      approved: [
        {
          id: "a1",
          type: { code: "LEAVE", name: "Leave" },
          requester: { name: "Team Member", staff_code: "089" },
          forwarded_to: { name: "Deputy One", staff_code: "006" },
        },
        { id: "a2", forwarded_to: { name: "Deputy Two", staff_code: "007" } },
      ],
    });
  });

  it("biso24_approve_requests approves nothing when an id does not await my approval", async () => {
    const fetchMock = approvalRoutes([
      awaitingMyApproval("a1", [person("006", "Deputy One")]),
    ]);
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_approve_requests",
      arguments: { request_ids: ["a1", "not-mine"] },
    });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toMatch(/not-mine/);
    expect(approvalPosts(fetchMock)).toHaveLength(0);
  });

  it("biso24_approve_requests approves nothing when a request is at its last step", async () => {
    const fetchMock = approvalRoutes([
      awaitingMyApproval("a1", [person("006", "Deputy One")]),
      awaitingMyApproval("last", null),
    ]);
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_approve_requests",
      arguments: { request_ids: ["a1", "last"] },
    });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toMatch(/last approval step/);
    expect(approvalPosts(fetchMock)).toHaveLength(0);
  });

  it.each([
    ["no", []],
    ["several", [person("006", "Deputy One"), person("007", "Deputy Two")]],
  ])(
    "biso24_approve_requests refuses a next step with %s approvers",
    async (_, next) => {
      const fetchMock = approvalRoutes([awaitingMyApproval("a1", next)]);
      const client = await connectTestClient(fetchMock);

      const result = await client.callTool({
        name: "biso24_approve_requests",
        arguments: { request_ids: ["a1"] },
      });

      expect(result.isError).toBe(true);
      expect(resultText(result)).toMatch(/unclear who to forward it to/);
      expect(approvalPosts(fetchMock)).toHaveLength(0);
    },
  );

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
