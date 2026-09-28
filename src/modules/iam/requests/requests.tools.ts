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
import { listMyRequests, listRequestTypes } from "./requests.api";

export function registerRequestTools(
  server: McpServer,
  client: Biso24Client,
): void {
  defineTool(server, {
    name: "biso24_list_my_requests",
    title: "List my requests",
    description:
      "List requests (leave, attendance correction, overtime, business trip, shift change...) of " +
      "the logged-in employee (identified by the token), newest first, paginated. Each item is a " +
      "summary: id, type code/name, from/to dates the request applies to (plus per-day parts for " +
      "leave), status (NEW = draft not yet submitted, PROCESSING, APPROVED, REJECTED), the current " +
      "approval step, the next approver while one is awaited, note and creation time. Also returns " +
      "how many are pending approval. To see which request types exist, use biso24_list_request_types.",
    inputSchema: {
      type: z
        .string()
        .default("OWNER")
        .describe(
          "Filter; OWNER = requests created by me (other values unverified).",
        ),
      ...paginationShape,
    },
    annotations: READ_ONLY,
    handler: async ({ type, limit, offset }) => {
      const [result, types] = await Promise.all([
        listMyRequests(client, { type, ...toPageParams({ limit, offset }) }),
        listRequestTypes(client),
      ]);
      const typeNames = typeNameIndex(types);
      return {
        items: result.data.map((r) => summarizeRequest(r, typeNames)),
        ...pageMeta({ limit, offset }, result.data.length, result.total),
        total_pending_approval: result.totalPendingApproval,
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
