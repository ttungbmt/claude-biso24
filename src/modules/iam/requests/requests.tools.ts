import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Biso24Client } from "#core/http/biso24-client";
import { defineTool, READ_ONLY } from "#core/mcp/define-tool";
import {
  pageMeta,
  paginate,
  paginationShape,
  toPageParams,
} from "#core/mcp/pagination";
import { summarizeRequest, typeNameIndex } from "./request-summary";
import {
  listMyRequests,
  listRequestsToApprove,
  listRequestTypes,
  type RequestEmployeePage,
  type RequestType,
} from "./requests.api";

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
