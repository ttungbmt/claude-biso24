import type {
  McpServer,
  ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  ShapeOutput,
  ZodRawShapeCompat,
} from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { ok, toolError } from "./tool-result";

/** Annotations for tools that only read from the Biso24 API. */
export const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

export interface ToolDefinition<Shape extends ZodRawShapeCompat> {
  name: `biso24_${string}`;
  title: string;
  /** Say what it does and when to use / not use it. */
  description: string;
  inputSchema: Shape;
  annotations: ToolAnnotations;
  /** Returns the data to show; errors may be thrown and become tool errors. */
  handler: (args: ShapeOutput<Shape>) => Promise<unknown>;
}

/**
 * Registers a tool. The handler just returns data: it is serialized to JSON
 * (truncated) for the LLM and sent as structuredContent, and any thrown error
 * becomes an actionable `isError` result instead of escaping the server.
 */
export function defineTool<Shape extends ZodRawShapeCompat>(
  server: McpServer,
  { name, handler, ...config }: ToolDefinition<Shape>,
): void {
  const callback = async (args: ShapeOutput<Shape>) => {
    try {
      const data = await handler(args);
      return ok(JSON.stringify(data, null, 2), toStructured(data));
    } catch (error) {
      return toolError(error);
    }
  };
  // TS can't resolve ToolCallback's conditional type for a generic Shape.
  server.registerTool(name, config, callback as unknown as ToolCallback<Shape>);
}

/** structuredContent must be a JSON object. */
function toStructured(data: unknown): Record<string, unknown> {
  return typeof data === "object" && data !== null && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : { result: data };
}
