/**
 * Phase 6 — Notification Intelligence Engine Enums
 *
 * These mirror the Prisma enums so service code can reference them
 * without importing from @prisma/client directly.
 */

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum NotificationPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum NotificationEventType {
  CREATED = 'CREATED',
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  OPENED = 'OPENED',
  CLICKED = 'CLICKED',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
  RETRY = 'RETRY',
}

export enum DeliveryAttemptStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  RETRY = 'RETRY',
}

/** Logical notification types (stored in Notification.type column) */
export enum NotificationType {
  INSTANT_ALERT = 'INSTANT_ALERT',
  DAILY_DIGEST = 'DAILY_DIGEST',
  WEEKLY_DIGEST = 'WEEKLY_DIGEST',
  SYSTEM = 'SYSTEM',
  TEST = 'TEST',
}

/** Decision engine outcome — what to do with a recommendation */
export enum DeliveryDecision {
  /** Send immediately via configured channels */
  INSTANT = 'INSTANT',
  /** Add to today's digest batch */
  DAILY_DIGEST = 'DAILY_DIGEST',
  /** Add to this week's digest batch */
  WEEKLY_DIGEST = 'WEEKLY_DIGEST',
  /** Score too low — skip entirely */
  SKIP = 'SKIP',
}
