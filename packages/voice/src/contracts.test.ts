import { describe, expect, test } from "bun:test";
import {
  VoiceNotificationRequestSchema,
  VoiceSettingsSchema,
} from "@chorus/voice";

describe("voice contracts", () => {
  describe("VoiceNotificationRequestSchema", () => {
    test("validates a complete request", () => {
      const input = {
        type: "approval_needed",
        text: "Test notification",
        cardId: "card-123",
        projectId: "proj-456",
        voiceId: "voice-789",
        modelId: "eleven_multilingual_v2",
        priority: "high",
      };
      const result = VoiceNotificationRequestSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("validates a minimal request", () => {
      const input = {
        type: "task_completed",
        text: "Done",
      };
      const result = VoiceNotificationRequestSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe("normal");
      }
    });

    test("rejects empty text", () => {
      const input = {
        type: "approval_needed",
        text: "",
      };
      const result = VoiceNotificationRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test("rejects text over 5000 characters", () => {
      const input = {
        type: "approval_needed",
        text: "a".repeat(5001),
      };
      const result = VoiceNotificationRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test("rejects invalid notification type", () => {
      const input = {
        type: "invalid_type",
        text: "Test",
      };
      const result = VoiceNotificationRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test("rejects invalid priority", () => {
      const input = {
        type: "approval_needed",
        text: "Test",
        priority: "urgent",
      };
      const result = VoiceNotificationRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("VoiceSettingsSchema", () => {
    test("validates default settings", () => {
      const input = {};
      const result = VoiceSettingsSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.muteAll).toBe(false);
        expect(result.data.narrationMode).toBe("concise");
      }
    });

    test("validates full settings", () => {
      const input = {
        muteAll: true,
        mobileOnly: true,
        desktopOnly: false,
        approvalsOnly: true,
        failuresOnly: false,
        narrationMode: "verbose",
      };
      const result = VoiceSettingsSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("rejects invalid narrationMode", () => {
      const input = {
        narrationMode: "detailed",
      };
      const result = VoiceSettingsSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
