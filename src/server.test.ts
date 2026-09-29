import { describe, expect, it, vi } from "vitest";
import {
  connectTestClient,
  envelopeFetch,
  resultText,
} from "#test/helpers/mcp-harness";

describe("MCP server", () => {
  it("registers every tool with the biso24_ prefix", async () => {
    const client = await connectTestClient(envelopeFetch(null));

    expect(client.getServerVersion()?.name).toBe("biso24-mcp-server");
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "biso24_approve_requests",
      "biso24_create_my_attendance_correction",
      "biso24_delete_my_request",
      "biso24_get_employee",
      "biso24_get_my_timekeeping",
      "biso24_get_my_timekeeping_summary",
      "biso24_get_my_work_shift",
      "biso24_list_attendance_correction_approvers",
      "biso24_list_my_requests",
      "biso24_list_my_work_shifts",
      "biso24_list_request_types",
      "biso24_list_requests_to_approve",
      "biso24_submit_my_request",
    ]);
    // Write tools (ADR 0005, 0006) must say so; every other tool is read-only.
    const writeTools = [
      "biso24_approve_requests",
      "biso24_create_my_attendance_correction",
      "biso24_delete_my_request",
      "biso24_submit_my_request",
    ];
    for (const tool of tools) {
      expect(tool.title).toBeTruthy();
      expect(tool.annotations?.readOnlyHint).toBe(
        !writeTools.includes(tool.name),
      );
    }
  });

  it("turns a failed login into an actionable tool error", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            success: false,
            message: "Wrong password",
            data: null,
          }),
          { status: 400 },
        ),
    );
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_get_my_work_shift",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toMatch(
      /Login to Biso24 failed.*Wrong password/,
    );
    expect(resultText(result)).toMatch(/\/plugin configure biso24/);
    expect(resultText(result)).toMatch(/BISO24_EMAIL/);
    expect(resultText(result)).not.toMatch(/"pw"|: pw\b/);
  });
});
