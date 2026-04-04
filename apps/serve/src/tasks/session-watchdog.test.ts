import { describe, expect, mock, test } from "bun:test";
import { SessionWatchdog } from "./session-watchdog";

function makeMockBridge() {
  return {
    abortSession: mock(async () => undefined),
  };
}

describe("SessionWatchdog", () => {
  const TIMEOUT_MS = 100;

  test("calls onTimeout after the configured delay", async () => {
    const bridge = makeMockBridge();
    const onTimeout = mock();
    const watchdog = new SessionWatchdog(
      bridge as never,
      { onTimeout },
      TIMEOUT_MS
    );

    watchdog.start("sess-1", { boardId: "board-1", directory: "/tmp/repo" });

    await new Promise((r) => setTimeout(r, TIMEOUT_MS + 50));

    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(onTimeout).toHaveBeenCalledWith(
      "sess-1",
      { boardId: "board-1", directory: "/tmp/repo" },
      expect.stringContaining("Session timed out after")
    );
    expect(bridge.abortSession).toHaveBeenCalledWith("sess-1");

    watchdog.dispose();
  });

  test("resets the timer on activity", async () => {
    const bridge = makeMockBridge();
    const onTimeout = mock();
    const watchdog = new SessionWatchdog(
      bridge as never,
      { onTimeout },
      TIMEOUT_MS
    );

    watchdog.start("sess-1", { boardId: "board-1", directory: "/tmp/repo" });

    await new Promise((r) => setTimeout(r, TIMEOUT_MS - 30));
    watchdog.reset("sess-1");

    await new Promise((r) => setTimeout(r, TIMEOUT_MS - 30));
    expect(onTimeout).not.toHaveBeenCalled();

    await new Promise((r) => setTimeout(r, TIMEOUT_MS + 50));
    expect(onTimeout).toHaveBeenCalledTimes(1);

    watchdog.dispose();
  });

  test("stops tracking when session completes", async () => {
    const bridge = makeMockBridge();
    const onTimeout = mock();
    const watchdog = new SessionWatchdog(
      bridge as never,
      { onTimeout },
      TIMEOUT_MS
    );

    watchdog.start("sess-1", { boardId: "board-1", directory: "/tmp/repo" });
    watchdog.stop("sess-1");

    await new Promise((r) => setTimeout(r, TIMEOUT_MS + 50));
    expect(onTimeout).not.toHaveBeenCalled();
    expect(bridge.abortSession).not.toHaveBeenCalled();

    watchdog.dispose();
  });

  test("clears all timers on dispose", async () => {
    const bridge = makeMockBridge();
    const onTimeout = mock();
    const watchdog = new SessionWatchdog(
      bridge as never,
      { onTimeout },
      TIMEOUT_MS
    );

    watchdog.start("sess-1", { boardId: "board-1", directory: "/tmp/repo" });
    watchdog.start("sess-2", { boardId: "board-2", directory: "/tmp/repo2" });
    watchdog.dispose();

    await new Promise((r) => setTimeout(r, TIMEOUT_MS + 50));
    expect(onTimeout).not.toHaveBeenCalled();
  });

  test("reports correct status", async () => {
    const bridge = makeMockBridge();
    const onTimeout = mock();
    const watchdog = new SessionWatchdog(
      bridge as never,
      { onTimeout },
      TIMEOUT_MS
    );

    expect(watchdog.getStatus()).toEqual({
      activeSessions: 0,
      oldestSessionAgeMs: 0,
    });

    watchdog.start("sess-1", { boardId: "board-1", directory: "/tmp/repo" });
    await new Promise((r) => setTimeout(r, 20));

    const status = watchdog.getStatus();
    expect(status.activeSessions).toBe(1);
    expect(status.oldestSessionAgeMs).toBeGreaterThanOrEqual(15);

    watchdog.dispose();
  });

  test("does not timeout unknown session on reset", async () => {
    const bridge = makeMockBridge();
    const onTimeout = mock();
    const watchdog = new SessionWatchdog(
      bridge as never,
      { onTimeout },
      TIMEOUT_MS
    );

    watchdog.reset("unknown-sess");

    await new Promise((r) => setTimeout(r, TIMEOUT_MS + 50));
    expect(onTimeout).not.toHaveBeenCalled();

    watchdog.dispose();
  });

  test("replaces timer on duplicate start", async () => {
    const bridge = makeMockBridge();
    const onTimeout = mock();
    const watchdog = new SessionWatchdog(
      bridge as never,
      { onTimeout },
      TIMEOUT_MS
    );

    watchdog.start("sess-1", { boardId: "board-1", directory: "/tmp/repo" });
    watchdog.start("sess-1", { boardId: "board-1", directory: "/tmp/repo" });

    await new Promise((r) => setTimeout(r, TIMEOUT_MS + 50));
    expect(onTimeout).toHaveBeenCalledTimes(1);

    watchdog.dispose();
  });

  test("aborts session even if abort fails", async () => {
    const bridge = {
      abortSession: mock(() => Promise.reject(new Error("abort failed"))),
    };
    const onTimeout = mock();
    const watchdog = new SessionWatchdog(
      bridge as never,
      { onTimeout },
      TIMEOUT_MS
    );

    watchdog.start("sess-1", { boardId: "board-1", directory: "/tmp/repo" });

    await new Promise((r) => setTimeout(r, TIMEOUT_MS + 50));

    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(bridge.abortSession).toHaveBeenCalledWith("sess-1");

    watchdog.dispose();
  });
});
