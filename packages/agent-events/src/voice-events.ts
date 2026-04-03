import {
  VoiceNotificationPriorityEnum,
  VoiceNotificationTypeEnum,
} from "@chorus/voice";
import { z } from "zod";

export const VoiceEventSchema = z.object({
  eventType: z.enum([
    "voice.enqueued",
    "voice.generated",
    "voice.played",
    "voice.failed",
  ]),
  notificationId: z.string(),
  cardId: z.string().optional(),
  projectId: z.string().optional(),
  notificationType: VoiceNotificationTypeEnum,
  priority: VoiceNotificationPriorityEnum,
  timestamp: z.date(),
  error: z.string().optional(),
});

export type VoiceEvent = z.infer<typeof VoiceEventSchema>;

export const CardEventSchema = z.object({
  eventType: z.enum([
    "card.created",
    "card.queued",
    "card.started",
    "card.moved",
    "card.waiting_for_approval",
    "card.approved",
    "card.rejected",
    "card.redirected",
    "card.aborted",
    "card.completed",
    "card.failed",
  ]),
  cardId: z.string(),
  projectId: z.string(),
  timestamp: z.date(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CardEvent = z.infer<typeof CardEventSchema>;

export const NormalizedEventSchema = z.discriminatedUnion("domain", [
  z.object({
    domain: z.literal("voice"),
    event: VoiceEventSchema,
  }),
  z.object({
    domain: z.literal("card"),
    event: CardEventSchema,
  }),
]);

export type NormalizedEvent = z.infer<typeof NormalizedEventSchema>;

export function toVoiceEvent(
  cardEvent: CardEvent,
  notificationId: string
): VoiceEvent {
  const notificationTypeMap: Record<
    string,
    z.infer<typeof VoiceNotificationTypeEnum>
  > = {
    "card.waiting_for_approval": "approval_needed",
    "card.failed": "task_failed",
    "card.completed": "task_completed",
    "card.aborted": "task_blocked",
  };

  const type = notificationTypeMap[cardEvent.eventType] ?? "task_completed";

  return {
    eventType: "voice.enqueued",
    notificationId,
    cardId: cardEvent.cardId,
    projectId: cardEvent.projectId,
    notificationType: type,
    priority: type === "approval_needed" ? "high" : "normal",
    timestamp: new Date(),
  };
}
