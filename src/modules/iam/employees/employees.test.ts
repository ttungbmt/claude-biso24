import { describe, expect, it } from "vitest";
import {
  connectTestClient,
  envelopeFetch,
  fetchCall,
  resultText,
  TEST_TOKEN,
} from "#test/helpers/mcp-harness.js";

describe("biso24_get_employee", () => {
  it("fetches the employee with the requested includes", async () => {
    const fetchMock = envelopeFetch({ _id: "e1", fullName: "An" });
    const client = await connectTestClient(fetchMock);

    const result = await client.callTool({
      name: "biso24_get_employee",
      arguments: { employee_id: "e1", include_histories: true },
    });

    const { url, headers } = fetchCall(fetchMock);
    expect(url.pathname).toBe("/v1/employees/e1");
    expect(url.searchParams.get("histories")).toBe("true");
    expect(url.searchParams.get("profiles")).toBe("false");
    expect(headers.Authorization).toBe(`Bearer ${TEST_TOKEN}`);
    expect(headers.domain).toBe("acme.biso24.net");
    expect(result.structuredContent).toEqual({ _id: "e1", fullName: "An" });
  });

  it("returns an actionable error when the employee does not exist", async () => {
    const client = await connectTestClient(envelopeFetch(null, 404));

    const result = await client.callTool({
      name: "biso24_get_employee",
      arguments: { employee_id: "missing" },
    });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toMatch(/not found/i);
  });

  it("explains a 403 as reading another employee's record", async () => {
    const client = await connectTestClient(envelopeFetch(null, 403));

    const result = await client.callTool({
      name: "biso24_get_employee",
      arguments: { employee_id: "someone-else" },
    });

    expect(result.isError).toBe(true);
    expect(resultText(result)).toMatch(/permission denied.*own records/i);
  });
});
