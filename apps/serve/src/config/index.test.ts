import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { loadConfig } from "./index";

describe("loadConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("returns defaults when no env vars are set", () => {
    process.env.PORT = undefined as unknown as string;
    process.env.HOSTNAME = undefined as unknown as string;
    process.env.OPENCODE_BASE_URL = undefined as unknown as string;
    process.env.OPENCODE_DIRECTORY = undefined as unknown as string;

    const config = loadConfig();

    expect(config.port).toBe(2000);
    expect(config.hostname).toBe("localhost");
    expect(config.opencodeBaseUrl).toBe("http://localhost:4096");
    expect(config.opencodeDirectory).toBe(process.cwd());
  });

  test("reads PORT from env", () => {
    process.env.PORT = "3000";

    const config = loadConfig();

    expect(config.port).toBe(3000);
  });

  test("reads HOSTNAME from env", () => {
    process.env.HOSTNAME = "0.0.0.0";

    const config = loadConfig();

    expect(config.hostname).toBe("0.0.0.0");
  });

  test("reads OPENCODE_BASE_URL from env", () => {
    process.env.OPENCODE_BASE_URL = "http://example.com:9999";

    const config = loadConfig();

    expect(config.opencodeBaseUrl).toBe("http://example.com:9999");
  });

  test("reads OPENCODE_DIRECTORY from env", () => {
    process.env.OPENCODE_DIRECTORY = "/tmp/test-dir";

    const config = loadConfig();

    expect(config.opencodeDirectory).toBe("/tmp/test-dir");
  });

  test("parses PORT as a number", () => {
    process.env.PORT = "8080";

    const config = loadConfig();

    expect(typeof config.port).toBe("number");
    expect(config.port).toBe(8080);
  });

  test("handles all env vars set simultaneously", () => {
    process.env.PORT = "5000";
    process.env.HOSTNAME = "127.0.0.1";
    process.env.OPENCODE_BASE_URL = "http://opencode:4096";
    process.env.OPENCODE_DIRECTORY = "/workspace";

    const config = loadConfig();

    expect(config).toEqual({
      port: 5000,
      hostname: "127.0.0.1",
      opencodeBaseUrl: "http://opencode:4096",
      opencodeDirectory: "/workspace",
    });
  });

  test("throws on non-numeric PORT", () => {
    process.env.PORT = "not-a-number";

    expect(() => loadConfig()).toThrow(
      'Invalid PORT "not-a-number": must be a number between 1 and 65535'
    );
  });

  test("throws on PORT out of range (zero)", () => {
    process.env.PORT = "0";

    expect(() => loadConfig()).toThrow(
      'Invalid PORT "0": must be a number between 1 and 65535'
    );
  });

  test("throws on PORT out of range (negative)", () => {
    process.env.PORT = "-1";

    expect(() => loadConfig()).toThrow(
      'Invalid PORT "-1": must be a number between 1 and 65535'
    );
  });

  test("throws on PORT out of range (too high)", () => {
    process.env.PORT = "70000";

    expect(() => loadConfig()).toThrow(
      'Invalid PORT "70000": must be a number between 1 and 65535'
    );
  });

  test("accepts boundary ports (1 and 65535)", () => {
    process.env.PORT = "1";
    expect(loadConfig().port).toBe(1);

    process.env.PORT = "65535";
    expect(loadConfig().port).toBe(65_535);
  });
});
