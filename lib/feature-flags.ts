/**
 * Feature flags for gradual rollout and rollback capabilities
 */

export const FeatureFlags = {
  // Controls global fallback for reserving inventory at request cr
  // 
  // eation time.
  // Now defaults to true (unless explicitly disabled) and actual logic also
  // respects the per-book `reserveOnRequest` column. If either the per-book
  // flag OR this global flag is true, reservation occurs at request time.
  RESERVE_ON_REQUEST: process.env.FEATURE_RESERVE_ON_REQUEST !== "false",

  // Controls whether the notify-me feature is enabled
  ENABLE_NOTIFY: process.env.FEATURE_ENABLE_NOTIFY !== "false", // Default enabled

  // Controls whether overdue detection and notifications are enabled
  ENABLE_OVERDUE: process.env.FEATURE_ENABLE_OVERDUE !== "false", // Default enabled

  // Controls whether background jobs are enabled
  ENABLE_BACKGROUND_JOBS:
    process.env.FEATURE_ENABLE_BACKGROUND_JOBS !== "false", // Default enabled

  // Controls whether idempotency checks are enforced
  ENABLE_IDEMPOTENCY: process.env.FEATURE_ENABLE_IDEMPOTENCY !== "false", // Default enabled

  // Controls whether audit logging is enabled
  ENABLE_AUDIT_LOGS: process.env.FEATURE_ENABLE_AUDIT_LOGS !== "false", // Default enabled

  // Controls whether email notifications are sent
  ENABLE_EMAIL_NOTIFICATIONS:
    process.env.FEATURE_ENABLE_EMAIL_NOTIFICATIONS !== "false", // Default enabled
} as const;

/**
 * Helper function to check if a feature is enabled
 */
export function isFeatureEnabled(flag: keyof typeof FeatureFlags): boolean {
  return FeatureFlags[flag];
}

/**
 * Rollback configuration - defines what to disable in case of emergencies
 */
export const RollbackConfig = {
  // Disable all background jobs
  EMERGENCY_DISABLE_JOBS: process.env.EMERGENCY_DISABLE_JOBS === "true",

  // Disable all email notifications
  EMERGENCY_DISABLE_EMAILS: process.env.EMERGENCY_DISABLE_EMAILS === "true",

  // Disable new features (notifications, overdue)
  EMERGENCY_DISABLE_NEW_FEATURES:
    process.env.EMERGENCY_DISABLE_NEW_FEATURES === "true",
} as const;

/**
 * Check if emergency rollback is active
 */
export function isEmergencyRollback(): boolean {
  return (
    RollbackConfig.EMERGENCY_DISABLE_JOBS ||
    RollbackConfig.EMERGENCY_DISABLE_EMAILS ||
    RollbackConfig.EMERGENCY_DISABLE_NEW_FEATURES
  );
}
