import { describe, expect, test } from "bun:test";
import {
  asBoardId,
  asCardId,
  buildApprovalQuery,
  buildBoardQuery,
  buildCardQuery,
  buildConnectionOptions,
  buildRunQuery,
  ChorusConnectionManager,
  createNoOpReducer,
  createSubscriptionHandle,
  filterApprovals,
  filterCards,
  filterRuns,
  getActiveRuns,
  getCardsByBoard,
  getCardsByStatus,
  getCardsInRace,
  getDownstreamCards,
  getEventsByCard,
  getLatestRunForCard,
  getRunsByCard,
  getUpstreamCards,
  sortCardsBy,
} from "../src/index";
import type {
  AgentEvent,
  ApprovalRequest,
  TaskCard,
  TaskDependency,
  TaskRun,
} from "./index";

function makeCard(overrides: Partial<TaskCard> = {}): TaskCard {
  return {
    id: "card-1",
    boardId: "board-1",
    title: "Test Card",
    prompt: "Do something",
    status: "queue",
    activity: "idle",
    position: { x: 0, y: 0 },
    laneId: "lane-1",
    createdAt: 1000n,
    updatedAt: 1000n,
    ...overrides,
  };
}

function makeRun(overrides: Partial<TaskRun> = {}): TaskRun {
  return {
    id: "run-1",
    cardId: "card-1",
    sessionId: "session-1",
    status: "running",
    startedAt: 1000n,
    redirectCount: 0,
    ...overrides,
  };
}

function makeApproval(
  overrides: Partial<ApprovalRequest> = {}
): ApprovalRequest {
  return {
    id: "approval-1",
    cardId: "card-1",
    runId: "run-1",
    message: "Approve this?",
    status: "pending",
    requestedAt: 1000n,
    ...overrides,
  };
}

function makeDependency(
  overrides: Partial<TaskDependency> = {}
): TaskDependency {
  return {
    id: "dep-1",
    upstreamCardId: "card-a",
    downstreamCardId: "card-b",
    condition: "success",
    createdAt: 1000n,
    ...overrides,
  };
}

function makeEvent(overrides: Partial<AgentEvent> = {}): AgentEvent {
  return {
    id: "event-1",
    cardId: "card-1",
    runId: "run-1",
    sessionId: "session-1",
    type: "card.created",
    payload: {},
    timestamp: 1000n,
    ...overrides,
  };
}

describe("buildCardQuery", () => {
  test("returns select all with no filter", () => {
    expect(buildCardQuery({})).toBe("SELECT * FROM task_card");
  });

  test("filters by boardId", () => {
    expect(buildCardQuery({ boardId: "board-1" })).toBe(
      "SELECT * FROM task_card WHERE boardId = 'board-1'"
    );
  });

  test("filters by single status", () => {
    expect(buildCardQuery({ status: "in_progress" })).toBe(
      "SELECT * FROM task_card WHERE status = 'in_progress'"
    );
  });

  test("filters by multiple statuses", () => {
    expect(buildCardQuery({ status: ["queue", "in_progress"] })).toBe(
      "SELECT * FROM task_card WHERE status IN ('queue', 'in_progress')"
    );
  });

  test("combines multiple filters", () => {
    const result = buildCardQuery({
      boardId: "board-1",
      status: "in_progress",
    });
    expect(result).toContain("boardId = 'board-1'");
    expect(result).toContain("status = 'in_progress'");
    expect(result).toContain("AND");
  });
});

describe("buildRunQuery", () => {
  test("returns select all with no filter", () => {
    expect(buildRunQuery({})).toBe("SELECT * FROM task_run");
  });

  test("filters by cardId", () => {
    expect(buildRunQuery({ cardId: "card-1" })).toBe(
      "SELECT * FROM task_run WHERE cardId = 'card-1'"
    );
  });
});

describe("buildBoardQuery", () => {
  test("returns select all with no filter", () => {
    expect(buildBoardQuery({})).toBe("SELECT * FROM board");
  });

  test("filters by projectId", () => {
    expect(buildBoardQuery({ projectId: "proj-1" })).toBe(
      "SELECT * FROM board WHERE projectId = 'proj-1'"
    );
  });
});

describe("buildApprovalQuery", () => {
  test("returns select all with no filter", () => {
    expect(buildApprovalQuery({})).toBe("SELECT * FROM approval_request");
  });

  test("filters by cardId and pending status", () => {
    const result = buildApprovalQuery({ cardId: "card-1", status: "pending" });
    expect(result).toContain("cardId = 'card-1'");
    expect(result).toContain("status = 'pending'");
  });
});

describe("filterCards", () => {
  const cards = [
    makeCard({ id: "card-1", boardId: "board-1", status: "in_progress" }),
    makeCard({ id: "card-2", boardId: "board-1", status: "queue" }),
    makeCard({ id: "card-3", boardId: "board-2", status: "done" }),
    makeCard({
      id: "card-4",
      boardId: "board-1",
      status: "approve",
      raceGroupId: "race-1",
    }),
  ];

  test("filters by boardId", () => {
    const result = filterCards(cards, { boardId: "board-1" });
    expect(result).toHaveLength(3);
    expect(result.every((c) => c.boardId === "board-1")).toBe(true);
  });

  test("filters by single status", () => {
    const result = filterCards(cards, { status: "done" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("card-3");
  });

  test("filters by multiple statuses", () => {
    const result = filterCards(cards, { status: ["queue", "done"] });
    expect(result).toHaveLength(2);
  });

  test("filters by raceGroupId", () => {
    const result = filterCards(cards, { raceGroupId: "race-1" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("card-4");
  });

  test("returns empty when no match", () => {
    const result = filterCards(cards, { boardId: "nonexistent" });
    expect(result).toHaveLength(0);
  });
});

describe("filterRuns", () => {
  const runs = [
    makeRun({ id: "run-1", cardId: "card-1", status: "running" }),
    makeRun({ id: "run-2", cardId: "card-1", status: "completed" }),
    makeRun({ id: "run-3", cardId: "card-2", status: "failed" }),
  ];

  test("filters by cardId", () => {
    const result = filterRuns(runs, { cardId: "card-1" });
    expect(result).toHaveLength(2);
  });

  test("filters by status", () => {
    const result = filterRuns(runs, { status: "running" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("run-1");
  });
});

describe("filterApprovals", () => {
  const approvals = [
    makeApproval({ id: "a-1", cardId: "card-1", status: "pending" }),
    makeApproval({ id: "a-2", cardId: "card-1", status: "approved" }),
    makeApproval({ id: "a-3", cardId: "card-2", status: "pending" }),
  ];

  test("filters by cardId", () => {
    const result = filterApprovals(approvals, { cardId: "card-1" });
    expect(result).toHaveLength(2);
  });

  test("filters by status", () => {
    const result = filterApprovals(approvals, { status: "pending" });
    expect(result).toHaveLength(2);
  });
});

describe("sortCardsBy", () => {
  const cards = [
    makeCard({ id: "card-1", createdAt: 3000n, status: "done" }),
    makeCard({ id: "card-2", createdAt: 1000n, status: "queue" }),
    makeCard({ id: "card-3", createdAt: 2000n, status: "in_progress" }),
  ];

  test("sorts by createdAt ascending", () => {
    const result = sortCardsBy(cards, "createdAt", "asc");
    expect(result.map((c) => c.id)).toEqual(["card-2", "card-3", "card-1"]);
  });

  test("sorts by createdAt descending", () => {
    const result = sortCardsBy(cards, "createdAt", "desc");
    expect(result.map((c) => c.id)).toEqual(["card-1", "card-3", "card-2"]);
  });

  test("sorts by status in kanban order", () => {
    const result = sortCardsBy(cards, "status", "asc");
    expect(result.map((c) => c.id)).toEqual(["card-2", "card-3", "card-1"]);
  });
});

describe("getCardsByBoard", () => {
  const cards = [
    makeCard({ id: "card-1", boardId: "board-1" }),
    makeCard({ id: "card-2", boardId: "board-1" }),
    makeCard({ id: "card-3", boardId: "board-2" }),
  ];

  test("groups cards by boardId", () => {
    const result = getCardsByBoard(cards);
    expect(result.get("board-1")).toHaveLength(2);
    expect(result.get("board-2")).toHaveLength(1);
  });
});

describe("getCardsByStatus", () => {
  const cards = [
    makeCard({ id: "card-1", status: "queue" }),
    makeCard({ id: "card-2", status: "queue" }),
    makeCard({ id: "card-3", status: "done" }),
  ];

  test("groups cards by status", () => {
    const result = getCardsByStatus(cards);
    expect(result.get("queue")).toHaveLength(2);
    expect(result.get("done")).toHaveLength(1);
  });
});

describe("getRunsByCard", () => {
  const runs = [
    makeRun({ id: "run-1", cardId: "card-1" }),
    makeRun({ id: "run-2", cardId: "card-1" }),
    makeRun({ id: "run-3", cardId: "card-2" }),
  ];

  test("groups runs by cardId", () => {
    const result = getRunsByCard(runs);
    expect(result.get("card-1")).toHaveLength(2);
    expect(result.get("card-2")).toHaveLength(1);
  });
});

describe("getDownstreamCards", () => {
  const deps = [
    makeDependency({ upstreamCardId: "card-a", downstreamCardId: "card-b" }),
    makeDependency({ upstreamCardId: "card-a", downstreamCardId: "card-c" }),
    makeDependency({ upstreamCardId: "card-b", downstreamCardId: "card-d" }),
  ];

  test("returns downstream cards for a given card", () => {
    const result = getDownstreamCards(deps, "card-a");
    expect(result).toContain("card-b");
    expect(result).toContain("card-c");
    expect(result).not.toContain("card-d");
  });
});

describe("getUpstreamCards", () => {
  const deps = [
    makeDependency({ upstreamCardId: "card-a", downstreamCardId: "card-b" }),
    makeDependency({ upstreamCardId: "card-c", downstreamCardId: "card-b" }),
  ];

  test("returns upstream cards for a given card", () => {
    const result = getUpstreamCards(deps, "card-b");
    expect(result).toContain("card-a");
    expect(result).toContain("card-c");
  });
});

describe("getEventsByCard", () => {
  const events = [
    makeEvent({ id: "e-1", cardId: "card-1" }),
    makeEvent({ id: "e-2", cardId: "card-1" }),
    makeEvent({ id: "e-3", cardId: "card-2" }),
  ];

  test("returns events for a given card", () => {
    const result = getEventsByCard(events, "card-1");
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.cardId === "card-1")).toBe(true);
  });
});

describe("getLatestRunForCard", () => {
  const runs = [
    makeRun({ id: "run-1", cardId: "card-1", startedAt: 1000n }),
    makeRun({ id: "run-2", cardId: "card-1", startedAt: 3000n }),
    makeRun({ id: "run-3", cardId: "card-1", startedAt: 2000n }),
  ];

  test("returns the most recent run", () => {
    const result = getLatestRunForCard(runs, "card-1");
    expect(result?.id).toBe("run-2");
  });

  test("returns null for unknown card", () => {
    const result = getLatestRunForCard(runs, "card-99");
    expect(result).toBeNull();
  });
});

describe("getActiveRuns", () => {
  const runs = [
    makeRun({ id: "run-1", status: "running" }),
    makeRun({ id: "run-2", status: "starting" }),
    makeRun({ id: "run-3", status: "completed" }),
    makeRun({ id: "run-4", status: "failed" }),
  ];

  test("returns only running and starting runs", () => {
    const result = getActiveRuns(runs);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toContain("run-1");
    expect(result.map((r) => r.id)).toContain("run-2");
  });
});

describe("getCardsInRace", () => {
  const cards = [
    makeCard({ id: "card-1", raceGroupId: "race-1" }),
    makeCard({ id: "card-2", raceGroupId: "race-1" }),
    makeCard({ id: "card-3", raceGroupId: "race-2" }),
    makeCard({ id: "card-4" }),
  ];

  test("returns cards in the given race group", () => {
    const result = getCardsInRace(cards, "race-1");
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.id)).toContain("card-1");
    expect(result.map((c) => c.id)).toContain("card-2");
  });
});

describe("buildConnectionOptions", () => {
  test("builds options without token", () => {
    const result = buildConnectionOptions({
      uri: "ws://localhost:3000",
      databaseName: "chorus",
    });
    expect(result.uri).toBe("ws://localhost:3000");
    expect(result.databaseName).toBe("chorus");
    expect(result.token).toBeUndefined();
  });

  test("builds options with token", () => {
    const result = buildConnectionOptions({
      uri: "ws://localhost:3000",
      databaseName: "chorus",
      token: "abc123",
    });
    expect(result.token).toBe("abc123");
  });
});

describe("createSubscriptionHandle", () => {
  test("wraps subscription handle", () => {
    const handle = createSubscriptionHandle({
      isActive: () => true,
      isEnded: () => false,
      unsubscribe: () => {
        // no-op for test
      },
    });
    expect(handle.isActive()).toBe(true);
    expect(handle.isEnded()).toBe(false);
  });
});

describe("ChorusConnectionManager", () => {
  test("starts disconnected", () => {
    const manager = new ChorusConnectionManager({
      uri: "ws://localhost:3000",
      databaseName: "chorus",
    });
    expect(manager.isConnected).toBe(false);
    expect(manager.identity).toBeNull();
  });

  test("becomes connected when setConnected is called", () => {
    const manager = new ChorusConnectionManager({
      uri: "ws://localhost:3000",
      databaseName: "chorus",
    });
    manager.setConnected("identity-abc");
    expect(manager.isConnected).toBe(true);
    expect(manager.identity).toBe("identity-abc");
  });

  test("becomes disconnected on handleDisconnect", () => {
    const manager = new ChorusConnectionManager({
      uri: "ws://localhost:3000",
      databaseName: "chorus",
    });
    manager.setConnected("identity-abc");
    manager.handleDisconnect();
    expect(manager.isConnected).toBe(false);
    expect(manager.identity).toBeNull();
  });

  test("calls onDisconnect callback", () => {
    let called = false;
    const manager = new ChorusConnectionManager(
      { uri: "ws://localhost:3000", databaseName: "chorus" },
      {
        onDisconnect: () => {
          called = true;
        },
      }
    );
    manager.handleDisconnect();
    expect(called).toBe(true);
  });

  test("exposes config", () => {
    const config = { uri: "ws://localhost:3000", databaseName: "chorus" };
    const manager = new ChorusConnectionManager(config);
    expect(manager.config).toBe(config);
  });
});

describe("createNoOpReducer", () => {
  test("throws when called", async () => {
    const reducer = createNoOpReducer<{ name: string }, { id: string }>();
    await expect(reducer({ name: "test" })).rejects.toThrow(
      "Reducer not connected"
    );
  });

  test("throws when setFlags is called", () => {
    const reducer = createNoOpReducer<{ name: string }>();
    expect(() => reducer.setFlags({})).toThrow("Reducer not connected");
  });

  test("returns noop unsubscribe from onCall", () => {
    const reducer = createNoOpReducer<{ name: string }>();
    const unsub = reducer.onCall(() => {
      // no-op callback for test
    });
    expect(typeof unsub).toBe("function");
    expect(() => unsub()).not.toThrow();
  });
});

describe("branded ID helpers", () => {
  test("asCardId creates branded ID", () => {
    const id = asCardId("card-123");
    expect(id as string).toBe("card-123");
  });

  test("asBoardId creates branded ID", () => {
    const id = asBoardId("board-456");
    expect(id as string).toBe("board-456");
  });
});
