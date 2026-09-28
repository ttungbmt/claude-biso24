import { z } from "zod";

const ConfigSchema = z.object({
  BISO24_API_URL: z.url(
    "BISO24_API_URL is required and must be a valid URL, e.g. https://api.biso24.com",
  ),
  BISO24_API_KEY: z
    .string({ error: "BISO24_API_KEY is required" })
    .min(1, "BISO24_API_KEY is required"),
});

export interface Config {
  apiUrl: string;
  apiKey: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = ConfigSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues.map(
      (i) => `  - ${i.path.join(".")}: ${i.message}`,
    );
    throw new Error(`Invalid configuration:\n${issues.join("\n")}`);
  }
  return {
    apiUrl: result.data.BISO24_API_URL.replace(/\/+$/, ""),
    apiKey: result.data.BISO24_API_KEY,
  };
}
