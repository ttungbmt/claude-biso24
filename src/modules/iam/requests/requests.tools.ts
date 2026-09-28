import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Biso24Client } from "#core/http/biso24-client.js";
import { defineTool, READ_ONLY } from "#core/mcp/define-tool.js";
import {
  pageMeta,
  paginate,
  paginationShape,
  toPageParams,
} from "#core/mcp/pagination.js";
import { listMyRequests, listRequestTypes } from "./requests.api.js";

export function registerRequestTools(
  server: McpServer,
  client: Biso24Client,
): void {
  defineTool(server, {
    name: "biso24_list_my_requests",
    title: "List my requests",
    description:
      "List requests (leave, overtime, business trip, shift change...) of the logged-in " +
      "employee (identified by the token), newest first, paginated. Also returns how many are " +
      "pending approval. To see which request types exist, use biso24_list_request_types.",
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
      const result = await listMyRequests(client, {
        type,
        ...toPageParams({ limit, offset }),
      });
      return {
        items: result.data,
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
