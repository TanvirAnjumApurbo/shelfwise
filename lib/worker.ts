import { workflowClient } from "./workflow";
import {
  runNightlyJobs,
  processDueNotifications,
  processAvailabilityNotifications,
} from "./background-jobs";
import { isFeatureEnabled } from "./feature-flags";
import { LibraryMetrics } from "./metrics";

/**
 * Background worker configuration and job execution
 * Uses simple scheduling approach compatible with serverless environments
 */

export class BackgroundWorker {
  /**
   * Execute the nightly maintenance workflow
   */
  static async executeNightlyMaintenance() {
    console.log("Starting nightly maintenance workflow...");

    try {
      await runNightlyJobs();
      console.log("Nightly maintenance completed successfully");
    } catch (error) {
      console.error("Nightly maintenance failed:", error);
      // Alert administrators about job failure
      await LibraryMetrics.alertHighFailureRate("NIGHTLY_JOBS", 1, 1);
      throw error;
    }
  }

  /**
   * Queue availability notification job when a book becomes available
   * This runs immediately when called
   */
  static async queueAvailabilityNotification(bookId: string) {
    if (
      !isFeatureEnabled("ENABLE_BACKGROUND_JOBS") ||
      !isFeatureEnabled("ENABLE_NOTIFY")
    ) {
      console.log("Availability notifications disabled, skipping queue");
      return;
    }

    try {
      // Execute immediately for now - in production this could be queued
      await processAvailabilityNotifications(bookId);
      console.log(`Processed availability notification for book ${bookId}`);
    } catch (error) {
      console.error(
        `Failed to process availability notification for book ${bookId}:`,
        error
      );
      // Don't throw - this is not critical for the main operation
    }
  }

  /**
   * Queue due reminder check (can be triggered manually or on schedule)
   */
  static async queueDueReminderCheck() {
    if (
      !isFeatureEnabled("ENABLE_BACKGROUND_JOBS") ||
      !isFeatureEnabled("ENABLE_OVERDUE")
    ) {
      console.log("Due reminders disabled, skipping queue");
      return;
    }

    try {
      // Execute immediately for now - in production this could be queued
      await processDueNotifications();
      console.log("Processed due reminder check");
    } catch (error) {
      console.error("Failed to process due reminder check:", error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Health check for background worker
   */
  static async healthCheck() {
    const stats = {
      backgroundJobsEnabled: isFeatureEnabled("ENABLE_BACKGROUND_JOBS"),
      overdueEnabled: isFeatureEnabled("ENABLE_OVERDUE"),
      notifyEnabled: isFeatureEnabled("ENABLE_NOTIFY"),
      emailNotificationsEnabled: isFeatureEnabled("ENABLE_EMAIL_NOTIFICATIONS"),
      lastCheck: new Date().toISOString(),
    };

    try {
      // Get recent metrics
      const metrics = await LibraryMetrics.getMetrics();
      const alerts = await LibraryMetrics.getRecentAlerts(5);

      return {
        status: "healthy",
        ...stats,
        recentMetrics: metrics,
        recentAlerts: alerts,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : String(error),
        ...stats,
      };
    }
  }
}

/**
 * CRON job configuration for different deployment environments
 */
export const CronConfig = {
  // For serverless environments (Vercel, Netlify)
  vercel: {
    // Use Vercel Cron Jobs (vercel.json)
    nightly: "0 2 * * *", // 2 AM daily
    hourly: "0 * * * *", // Every hour for health checks
  },

  // For traditional server environments
  server: {
    // Use node-cron or similar
    nightly: "0 2 * * *",
    hourly: "0 * * * *",
    // Additional frequent checks
    every15minutes: "*/15 * * * *",
  },

  // For containerized environments (Docker, Kubernetes)
  container: {
    // Use Kubernetes CronJobs or Docker with cron
    nightly: "0 2 * * *",
    healthCheck: "*/5 * * * *", // Every 5 minutes
  },
};

/**
 * Manual job triggers for admin use
 */
export class ManualJobTriggers {
  static async triggerNightlyMaintenance() {
    console.log("Manually triggering nightly maintenance...");
    await BackgroundWorker.executeNightlyMaintenance();
  }

  static async triggerDueReminders() {
    console.log("Manually triggering due reminders...");
    await processDueNotifications();
  }

  static async triggerAvailabilityNotifications(bookId: string) {
    console.log(
      `Manually triggering availability notifications for book ${bookId}...`
    );
    await processAvailabilityNotifications(bookId);
  }

  static async runHealthCheck() {
    console.log("Running health check...");
    return await BackgroundWorker.healthCheck();
  }
}
