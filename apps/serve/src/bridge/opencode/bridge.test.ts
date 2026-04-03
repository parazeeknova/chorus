import { describe, expect, mock, test } from "bun:test";
import { OpenCodeBridge } from "./bridge";

describe("OpenCodeBridge", () => {
  test("creates bridge with valid config", () => {
    const bridge = new OpenCodeBridge("http://localhost:4096", "/tmp");

    expect(bridge).toBeDefined();
    expect(bridge.adapter).toBeDefined();
  });

  test("subscribe registers a callback and returns unsubscribe fn", () => {
    const bridge = new OpenCodeBridge("http://localhost:4096", "/tmp");
    const subscriber = mock(() => undefined);

    const unsubscribe = bridge.subscribe(subscriber);

    expect(typeof unsubscribe).toBe("function");

    unsubscribe();
  });

  test("getStatus returns connected false before start", () => {
    const bridge = new OpenCodeBridge("http://localhost:4096", "/tmp");

    const status = bridge.getStatus();

    expect(status.connected).toBe(false);
    expect(status.activeSessions).toBe(0);
    expect(status.opencodeUrl).toBe("http://localhost:4096");
    expect(status.uptime).toBeGreaterThanOrEqual(0);
  });

  test("races exposes adapter race manager", () => {
    const bridge = new OpenCodeBridge("http://localhost:4096", "/tmp");

    expect(bridge.races).toBeDefined();
    expect(typeof bridge.races.createRaceSessions).toBe("function");
    expect(typeof bridge.races.promptAll).toBe("function");
  });

  test("forkSession is available on bridge", () => {
    const bridge = new OpenCodeBridge("http://localhost:4096", "/tmp");

    expect(typeof bridge.forkSession).toBe("function");
  });

  test("startRace is available on bridge", () => {
    const bridge = new OpenCodeBridge("http://localhost:4096", "/tmp");

    expect(typeof bridge.startRace).toBe("function");
  });

  test("promptRace is available on bridge", () => {
    const bridge = new OpenCodeBridge("http://localhost:4096", "/tmp");

    expect(typeof bridge.promptRace).toBe("function");
  });
});
