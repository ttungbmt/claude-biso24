import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { CHARACTER_LIMIT } from "../../constants";
import { Biso24ApiError, Biso24AuthError } from "../http/errors";

export function truncate(text: string, limit = CHARACTER_LIMIT): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n\n[Truncated ${text.length - limit} characters. Use pagination (limit/offset) or add filters to narrow the results.]`;
}

/** Success result: text for the LLM + structuredContent for the client. */
export function ok(
  text: string,
  structured?: Record<string, unknown>,
): CallToolResult {
  return {
    content: [{ type: "text", text: truncate(text) }],
    ...(structured ? { structuredContent: structured } : {}),
  };
}

/** Turns any error into an actionable message for the LLM. */
export function toolError(error: unknown): CallToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: describeError(error) }],
  };
}

export function describeError(error: unknown): string {
  if (error instanceof Biso24AuthError) {
    return `Error: Login to Biso24 failed (${error.message}). Check BISO24_EMAIL, BISO24_PASSWORD, BISO24_ORG_ID and BISO24_DOMAIN.`;
  }
  if (error instanceof Biso24ApiError) {
    switch (error.status) {
      case 400:
      case 422:
        return `Error: Invalid request data (${error.status}). Details: ${stringify(error.body)}`;
      case 401:
        return "Error: Biso24 rejected the session even after logging in again. The account may lack access to this resource.";
      case 403:
        return "Error: Permission denied for this resource (403). The logged-in account lacks access; it may only read its own records. Check that the id belongs to the logged-in employee.";
      case 404:
        return "Error: Resource not found. Check the ID, or use a list/search tool to find the correct one.";
      case 429:
        return "Error: Rate limit exceeded. Wait a moment and retry.";
      default:
        return `Error: ${error.message}. Details: ${stringify(error.body)}`;
    }
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return "Error: Request to Biso24 timed out. Retry or narrow the query.";
  }
  return `Error: ${error instanceof Error ? error.message : String(error)}`;
}

function stringify(value: unknown): string {
  return truncate(
    typeof value === "string" ? value : JSON.stringify(value),
    2_000,
  );
}
