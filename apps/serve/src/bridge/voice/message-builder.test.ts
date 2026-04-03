import { describe, expect, test } from "bun:test";
import type { VoiceSettings } from "@chorus/voice";
import {
  buildNotificationMessage,
  shouldPlayNotification,
} from "./message-builder";

describe("message-builder", () => {
  describe("buildNotificationMessage", () => {
    const defaultSettings: VoiceSettings = {
      muteAll: false,
      mobileOnly: false,
      desktopOnly: false,
      approvalsOnly: false,
      failuresOnly: false,
      narrationMode: "concise",
    };

    test("returns custom text when provided", () => {
      const result = buildNotificationMessage(
        "approval_needed",
        defaultSettings,
        "Custom message here"
      );
      expect(result).toBe("Custom message here");
    });

    test("trims custom text", () => {
      const result = buildNotificationMessage(
        "approval_needed",
        defaultSettings,
        "  Custom message  "
      );
      expect(result).toBe("Custom message");
    });

    test("returns concise approval message for approval_needed", () => {
      const result = buildNotificationMessage(
        "approval_needed",
        defaultSettings
      );
      expect(result).toBe("Approval needed.");
    });

    test("returns concise blocked message for task_blocked", () => {
      const result = buildNotificationMessage("task_blocked", defaultSettings);
      expect(result).toBe("Task blocked.");
    });

    test("returns concise failed message for task_failed", () => {
      const result = buildNotificationMessage("task_failed", defaultSettings);
      expect(result).toBe("Task failed.");
    });

    test("returns concise completed message for task_completed", () => {
      const result = buildNotificationMessage(
        "task_completed",
        defaultSettings
      );
      expect(result).toBe("Task completed.");
    });

    test("returns concise policy blocked message for policy_blocked", () => {
      const result = buildNotificationMessage(
        "policy_blocked",
        defaultSettings
      );
      expect(result).toBe("Policy blocked action.");
    });

    test("returns concise summary message for task_summary", () => {
      const result = buildNotificationMessage("task_summary", defaultSettings);
      expect(result).toBe("Summary ready.");
    });

    test("returns verbose summary message for task_summary", () => {
      const verboseSettings: VoiceSettings = {
        ...defaultSettings,
        narrationMode: "verbose",
      };
      const result = buildNotificationMessage("task_summary", verboseSettings);
      expect(result).toBe("Task summary available.");
    });

    test("returns verbose message when narrationMode is verbose", () => {
      const verboseSettings: VoiceSettings = {
        ...defaultSettings,
        narrationMode: "verbose",
      };
      const result = buildNotificationMessage(
        "approval_needed",
        verboseSettings
      );
      expect(result).toBe(
        "Task requires your approval. Please review and take action."
      );
    });
  });

  describe("shouldPlayNotification", () => {
    const defaultSettings: VoiceSettings = {
      muteAll: false,
      mobileOnly: false,
      desktopOnly: false,
      approvalsOnly: false,
      failuresOnly: false,
      narrationMode: "concise",
    };

    test("plays all notifications by default", () => {
      expect(shouldPlayNotification(defaultSettings, "approval_needed")).toBe(
        true
      );
      expect(shouldPlayNotification(defaultSettings, "task_failed")).toBe(true);
      expect(shouldPlayNotification(defaultSettings, "task_completed")).toBe(
        true
      );
      expect(shouldPlayNotification(defaultSettings, "task_blocked")).toBe(
        true
      );
      expect(shouldPlayNotification(defaultSettings, "policy_blocked")).toBe(
        true
      );
    });

    test("blocks all when muteAll is true", () => {
      const settings: VoiceSettings = { ...defaultSettings, muteAll: true };
      expect(shouldPlayNotification(settings, "approval_needed")).toBe(false);
      expect(shouldPlayNotification(settings, "task_failed")).toBe(false);
    });

    test("only plays approval when approvalsOnly is true", () => {
      const settings: VoiceSettings = {
        ...defaultSettings,
        approvalsOnly: true,
      };
      expect(shouldPlayNotification(settings, "approval_needed")).toBe(true);
      expect(shouldPlayNotification(settings, "task_failed")).toBe(false);
      expect(shouldPlayNotification(settings, "task_completed")).toBe(false);
    });

    test("only plays failure-related when failuresOnly is true", () => {
      const settings: VoiceSettings = {
        ...defaultSettings,
        failuresOnly: true,
      };
      expect(shouldPlayNotification(settings, "task_failed")).toBe(true);
      expect(shouldPlayNotification(settings, "task_blocked")).toBe(true);
      expect(shouldPlayNotification(settings, "policy_blocked")).toBe(true);
      expect(shouldPlayNotification(settings, "approval_needed")).toBe(false);
      expect(shouldPlayNotification(settings, "task_completed")).toBe(false);
    });
  });
});
