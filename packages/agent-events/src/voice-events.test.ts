import { describe, expect, test } from "bun:test";
import {
  CardEventSchema,
  toVoiceEvent,
  VoiceEventSchema,
} from "@chorus/agent-events";

describe("voice-events", () => {
  describe("VoiceEventSchema", () => {
    test("validates a complete voice event", () => {
      const input = {
        eventType: "voice.enqueued",
        notificationId: "notif-123",
        cardId: "card-456",
        projectId: "proj-789",
        notificationType: "approval_needed",
        priority: "high",
        timestamp: new Date(),
      };
      const result = VoiceEventSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("validates with optional fields omitted", () => {
      const input = {
        eventType: "voice.generated",
        notificationId: "notif-123",
        notificationType: "task_completed",
        priority: "normal",
        timestamp: new Date(),
      };
      const result = VoiceEventSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("CardEventSchema", () => {
    test("validates a card event", () => {
      const input = {
        eventType: "card.waiting_for_approval",
        cardId: "card-123",
        projectId: "proj-456",
        timestamp: new Date(),
      };
      const result = CardEventSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("validates with optional metadata", () => {
      const input = {
        eventType: "card.completed",
        cardId: "card-123",
        projectId: "proj-456",
        timestamp: new Date(),
        metadata: { runId: "run-789" },
      };
      const result = CardEventSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("toVoiceEvent", () => {
    test("maps waiting_for_approval to approval_needed", () => {
      const cardEvent = {
        eventType: "card.waiting_for_approval" as const,
        cardId: "card-123",
        projectId: "proj-456",
        timestamp: new Date(),
      };
      const result = toVoiceEvent(cardEvent, "notif-1");
      expect(result.notificationType).toBe("approval_needed");
      expect(result.priority).toBe("high");
      expect(result.cardId).toBe("card-123");
    });

    test("maps failed to task_failed", () => {
      const cardEvent = {
        eventType: "card.failed" as const,
        cardId: "card-123",
        projectId: "proj-456",
        timestamp: new Date(),
      };
      const result = toVoiceEvent(cardEvent, "notif-2");
      expect(result.notificationType).toBe("task_failed");
      expect(result.priority).toBe("normal");
    });

    test("maps completed to task_completed", () => {
      const cardEvent = {
        eventType: "card.completed" as const,
        cardId: "card-123",
        projectId: "proj-456",
        timestamp: new Date(),
      };
      const result = toVoiceEvent(cardEvent, "notif-3");
      expect(result.notificationType).toBe("task_completed");
    });

    test("maps aborted to task_blocked", () => {
      const cardEvent = {
        eventType: "card.aborted" as const,
        cardId: "card-123",
        projectId: "proj-456",
        timestamp: new Date(),
      };
      const result = toVoiceEvent(cardEvent, "notif-4");
      expect(result.notificationType).toBe("task_blocked");
    });

    test("defaults unknown events to task_completed", () => {
      const cardEvent = {
        eventType: "card.created" as const,
        cardId: "card-123",
        projectId: "proj-456",
        timestamp: new Date(),
      };
      const result = toVoiceEvent(cardEvent, "notif-5");
      expect(result.notificationType).toBe("task_completed");
    });
  });
});
