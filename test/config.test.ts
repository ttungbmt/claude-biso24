import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("strips trailing slashes from the URL", () => {
    expect(
      loadConfig({ BISO24_API_URL: "https://a.test/v1/", BISO24_API_KEY: "k" }),
    ).toEqual({
      apiUrl: "https://a.test/v1",
      apiKey: "k",
    });
  });

  it("reports missing environment variables clearly", () => {
    expect(() => loadConfig({})).toThrow(/BISO24_API_URL[\s\S]*BISO24_API_KEY/);
  });
});
