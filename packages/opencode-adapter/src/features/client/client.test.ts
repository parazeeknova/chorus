import { describe, expect, test } from "bun:test";
import { createClient } from "./client";

describe("createClient", () => {
  test("creates a client with default options", () => {
    const { client } = createClient();
    expect(client).toBeDefined();
    expect(client.session).toBeDefined();
    expect(client.event).toBeDefined();
    expect(client.permission).toBeDefined();
  });

  test("creates a client with custom baseUrl", () => {
    const { client } = createClient({
      baseUrl: "http://localhost:4096",
    });
    expect(client).toBeDefined();
  });

  test("creates a client with directory option", () => {
    const { client } = createClient({
      directory: "/tmp/test-project",
    });
    expect(client).toBeDefined();
  });
});
