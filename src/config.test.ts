import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

const env = {
  BISO24_DOMAIN: "acme.biso24.net",
  BISO24_EMAIL: "me@acme.test",
  BISO24_PASSWORD: "pw",
  BISO24_ORG_ID: "org1",
};

describe("loadConfig", () => {
  it("maps env vars and strips trailing slashes from the URL", () => {
    expect(loadConfig({ ...env, BISO24_IAM_URL: "https://iam.test/" })).toEqual(
      {
        iamUrl: "https://iam.test",
        domain: "acme.biso24.net",
        credentials: { email: "me@acme.test", password: "pw", orgId: "org1" },
      },
    );
  });

  it("defaults the IAM URL", () => {
    expect(loadConfig(env).iamUrl).toBe("https://iam.biso24.org");
  });

  it("reports missing environment variables clearly", () => {
    expect(() => loadConfig({})).toThrow(
      /BISO24_DOMAIN[\s\S]*BISO24_EMAIL[\s\S]*BISO24_PASSWORD[\s\S]*BISO24_ORG_ID/,
    );
  });
});
