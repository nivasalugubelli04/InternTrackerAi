export enum AdminPermission {
  // User Management Permissions
  USER_VIEW = 'USER_VIEW',
  USER_MANAGE = 'USER_MANAGE',
  USER_SUSPEND = 'USER_SUSPEND',
  USER_RESTORE = 'USER_RESTORE',
  USER_NOTE_CREATE = 'USER_NOTE_CREATE',
  USER_NOTE_VIEW = 'USER_NOTE_VIEW',

  // Billing & Monetization
  BILLING_VIEW = 'BILLING_VIEW',
  BILLING_OVERRIDE = 'BILLING_OVERRIDE',
  BILLING_MANAGE = 'BILLING_MANAGE',

  // AI Operations & Telemetry
  AI_OPS_VIEW = 'AI_OPS_VIEW',
  AI_OPS_MANAGE = 'AI_OPS_MANAGE',

  // Background Jobs & Queues
  JOB_OPS_VIEW = 'JOB_OPS_VIEW',
  JOB_RETRY = 'JOB_RETRY',
  JOB_CANCEL = 'JOB_CANCEL',

  // System Health & Incidents
  SYSTEM_HEALTH_VIEW = 'SYSTEM_HEALTH_VIEW',
  SYSTEM_CONFIG_MANAGE = 'SYSTEM_CONFIG_MANAGE',
  INCIDENT_VIEW = 'INCIDENT_VIEW',
  INCIDENT_MANAGE = 'INCIDENT_MANAGE',

  // Feature Flags & Releases
  FEATURE_FLAG_MANAGE = 'FEATURE_FLAG_MANAGE',

  // Audit Logs & Security Signals
  AUDIT_LOG_VIEW = 'AUDIT_LOG_VIEW',
}

export const ROLE_PERMISSIONS: Record<string, AdminPermission[]> = {
  SUPER_ADMIN: Object.values(AdminPermission),
  ADMIN: [
    AdminPermission.USER_VIEW,
    AdminPermission.USER_MANAGE,
    AdminPermission.USER_SUSPEND,
    AdminPermission.USER_RESTORE,
    AdminPermission.USER_NOTE_CREATE,
    AdminPermission.USER_NOTE_VIEW,
    AdminPermission.BILLING_VIEW,
    AdminPermission.BILLING_OVERRIDE,
    AdminPermission.BILLING_MANAGE,
    AdminPermission.AI_OPS_VIEW,
    AdminPermission.AI_OPS_MANAGE,
    AdminPermission.JOB_OPS_VIEW,
    AdminPermission.JOB_RETRY,
    AdminPermission.JOB_CANCEL,
    AdminPermission.SYSTEM_HEALTH_VIEW,
    AdminPermission.SYSTEM_CONFIG_MANAGE,
    AdminPermission.INCIDENT_VIEW,
    AdminPermission.INCIDENT_MANAGE,
    AdminPermission.FEATURE_FLAG_MANAGE,
    AdminPermission.AUDIT_LOG_VIEW,
  ],
  OPERATIONS_ADMIN: [
    AdminPermission.SYSTEM_HEALTH_VIEW,
    AdminPermission.SYSTEM_CONFIG_MANAGE,
    AdminPermission.INCIDENT_VIEW,
    AdminPermission.INCIDENT_MANAGE,
    AdminPermission.JOB_OPS_VIEW,
    AdminPermission.JOB_RETRY,
    AdminPermission.JOB_CANCEL,
    AdminPermission.AI_OPS_VIEW,
    AdminPermission.FEATURE_FLAG_MANAGE,
    AdminPermission.AUDIT_LOG_VIEW,
  ],
  SUPPORT_ADMIN: [
    AdminPermission.USER_VIEW,
    AdminPermission.USER_NOTE_CREATE,
    AdminPermission.USER_NOTE_VIEW,
    AdminPermission.BILLING_VIEW,
    AdminPermission.BILLING_OVERRIDE,
    AdminPermission.INCIDENT_VIEW,
    AdminPermission.SYSTEM_HEALTH_VIEW,
  ],
  ANALYTICS_ADMIN: [
    AdminPermission.USER_VIEW,
    AdminPermission.BILLING_VIEW,
    AdminPermission.AI_OPS_VIEW,
    AdminPermission.SYSTEM_HEALTH_VIEW,
    AdminPermission.AUDIT_LOG_VIEW,
  ],
};
