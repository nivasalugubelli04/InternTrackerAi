/**
 * Phase 6 — Notification Engine Constants
 */

// ── Queue names ──────────────────────────────────────────────────────────────
export const NOTIFICATION_QUEUE = 'notification-queue';
export const EMAIL_QUEUE = 'email-queue';
export const PUSH_QUEUE = 'push-queue';
export const SMS_QUEUE = 'sms-queue';
export const DIGEST_QUEUE = 'digest-queue';
export const RETRY_QUEUE = 'retry-queue';
export const DEAD_LETTER_QUEUE = 'dead-letter-queue';

// ── Job names (within queues) ────────────────────────────────────────────────
export const JOB_SEND_EMAIL = 'send-email';
export const JOB_SEND_PUSH = 'send-push';
export const JOB_SEND_SMS = 'send-sms';
export const JOB_PROCESS_NOTIFICATION = 'process-notification';
export const JOB_DAILY_DIGEST = 'daily-digest';
export const JOB_WEEKLY_DIGEST = 'weekly-digest';
export const JOB_RETRY_NOTIFICATION = 'retry-notification';
export const JOB_DEAD_LETTER = 'dead-letter';

// ── Redis key prefixes ───────────────────────────────────────────────────────
/** Redis key: notif:freq:{userId}:total — daily total counter */
export const REDIS_NOTIF_FREQ_PREFIX = 'notif:freq';
/** Redis key: notif:dedup:{userId}:{jobId} — duplicate detection */
export const REDIS_NOTIF_DEDUP_PREFIX = 'notif:dedup';

// ── TTL values ───────────────────────────────────────────────────────────────
/** 24 hours in seconds — frequency counter TTL */
export const FREQ_COUNTER_TTL_SECONDS = 86_400;
/** 7 days — duplicate detection window */
export const DEDUP_TTL_SECONDS = 604_800;

// ── BullMQ default job options ───────────────────────────────────────────────
export const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};
