import { z } from "zod";

const required = (name: string, example?: string) =>
  z
    .string({ error: `${name} is required` })
    .min(1, `${name} is required${example ? `, e.g. ${example}` : ""}`);

const ConfigSchema = z.object({
  BISO24_IAM_URL: z
    .url("BISO24_IAM_URL must be a valid URL, e.g. https://iam.biso24.org")
    .default("https://iam.biso24.org"),
  BISO24_DOMAIN: required("BISO24_DOMAIN", "acme.biso24.net"),
  BISO24_EMAIL: required("BISO24_EMAIL"),
  BISO24_PASSWORD: required("BISO24_PASSWORD"),
  BISO24_ORG_ID: required("BISO24_ORG_ID"),
});

export interface Credentials {
  email: string;
  password: string;
  orgId: string;
}

export interface Config {
  /** Base URL of the IAM service (also hosts the login endpoint). */
  iamUrl: string;
  /** Tenant, sent as the `domain` header. */
  domain: string;
  /** Account used to log in; the server obtains and renews the JWT itself. */
  credentials: Credentials;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = ConfigSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues.map(
      (i) => `  - ${i.path.join(".")}: ${i.message}`,
    );
    throw new Error(`Invalid configuration:\n${issues.join("\n")}`);
  }
  const data = result.data;
  return {
    iamUrl: stripTrailingSlashes(data.BISO24_IAM_URL),
    domain: data.BISO24_DOMAIN,
    credentials: {
      email: data.BISO24_EMAIL,
      password: data.BISO24_PASSWORD,
      orgId: data.BISO24_ORG_ID,
    },
  };
}

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, "");
}
