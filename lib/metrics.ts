import { Redis } from "@upstash/redis";
import { createAuditLog } from "./audit";

const redis = Redis.fromEnv();

/**
 * Metrics tracking for library operations
 */
export class LibraryMetrics {
  private static async incrementCounter(key: string, increment = 1) {
    try {
      await redis.incrby(key, increment);
      // Set expiry for daily metrics (30 days retention)
      if (key.includes(":daily:")) {
        await redis.expire(key, 30 * 24 * 60 * 60); // 30 days
      }
    } catch (error) {
      console.error(`Failed to increment metric ${key}:`, error);
    }
  }

  private static async setGauge(key: string, value: number) {
    try {
      await redis.set(key, value);
    } catch (error) {
      console.error(`Failed to set gauge ${key}:`, error);
    }
  }

  private static getDateKey() {
    return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  }

  // Counter metrics
  static async recordBorrowRequestCreated() {
    const dateKey = this.getDateKey();
    await this.incrementCounter("metrics:borrow_requests:created:total");
    await this.incrementCounter(
      `metrics:borrow_requests:created:daily:${dateKey}`
    );
  }

  static async recordBorrowRequestApproved() {
    const dateKey = this.getDateKey();
    await this.incrementCounter("metrics:borrow_requests:approved:total");
    await this.incrementCounter(
      `metrics:borrow_requests:approved:daily:${dateKey}`
    );
  }

  static async recordBorrowRequestRejected() {
    const dateKey = this.getDateKey();
    await this.incrementCounter("metrics:borrow_requests:rejected:total");
    await this.incrementCounter(
      `metrics:borrow_requests:rejected:daily:${dateKey}`
    );
  }

  static async recordReturnRequestApproved() {
    const dateKey = this.getDateKey();
    await this.incrementCounter("metrics:return_requests:approved:total");
    await this.incrementCounter(
      `metrics:return_requests:approved:daily:${dateKey}`
    );
  }

  static async recordNotifyEmailSent() {
    const dateKey = this.getDateKey();
    await this.incrementCounter("metrics:notify_emails:sent:total");
    await this.incrementCounter(`metrics:notify_emails:sent:daily:${dateKey}`);
  }

  static async recordOverdueNotificationSent() {
    const dateKey = this.getDateKey();
    await this.incrementCounter("metrics:overdue_notifications:sent:total");
    await this.incrementCounter(
      `metrics:overdue_notifications:sent:daily:${dateKey}`
    );
  }

  static async recordDueSoonNotificationSent() {
    const dateKey = this.getDateKey();
    await this.incrementCounter("metrics:due_soon_notifications:sent:total");
    await this.incrementCounter(
      `metrics:due_soon_notifications:sent:daily:${dateKey}`
    );
  }

  static async recordIdempotencyHit() {
    const dateKey = this.getDateKey();
    await this.incrementCounter("metrics:idempotency:hits:total");
    await this.incrementCounter(`metrics:idempotency:hits:daily:${dateKey}`);
  }

  static async recordEmailFailure() {
    const dateKey = this.getDateKey();
    await this.incrementCounter("metrics:emails:failures:total");
    await this.incrementCounter(`metrics:emails:failures:daily:${dateKey}`);
  }

  // Alert metrics
  static async alertInventoryViolation(
    bookId: string,
    availableCopies: number
  ) {
    const alertKey = `alerts:inventory_violation:${bookId}:${Date.now()}`;

    try {
      await redis.set(alertKey, {
        bookId,
        availableCopies,
        timestamp: new Date().toISOString(),
        severity: "HIGH",
        message: `Book ${bookId} has negative available copies: ${availableCopies}`,
      });

      // Set alert expiry (7 days)
      await redis.expire(alertKey, 7 * 24 * 60 * 60);

      // Also log as audit entry
      await createAuditLog({
        action: "INVENTORY_UPDATED",
        actorType: "SYSTEM",
        targetBookId: bookId,
        metadata: {
          availableCopies,
          alertType: "NEGATIVE_INVENTORY",
          severity: "HIGH",
        },
      });

      console.error(
        `ALERT: Inventory violation for book ${bookId}: ${availableCopies} copies available`
      );
    } catch (error) {
      console.error("Failed to record inventory violation alert:", error);
    }
  }

  static async alertHighFailureRate(
    operation: string,
    failureCount: number,
    totalCount: number
  ) {
    const failureRate = (failureCount / totalCount) * 100;

    if (failureRate > 10) {
      // Alert if > 10% failure rate
      const alertKey = `alerts:high_failure_rate:${operation}:${Date.now()}`;

      try {
        await redis.set(alertKey, {
          operation,
          failureCount,
          totalCount,
          failureRate,
          timestamp: new Date().toISOString(),
          severity: failureRate > 25 ? "CRITICAL" : "HIGH",
          message: `High failure rate detected for ${operation}: ${failureRate.toFixed(
            2
          )}%`,
        });

        await redis.expire(alertKey, 7 * 24 * 60 * 60);

        console.error(
          `ALERT: High failure rate for ${operation}: ${failureRate.toFixed(
            2
          )}% (${failureCount}/${totalCount})`
        );
      } catch (error) {
        console.error("Failed to record high failure rate alert:", error);
      }
    }
  }

  // Gauge metrics for current state
  static async updateActiveUsers(count: number) {
    await this.setGauge("metrics:users:active:current", count);
  }

  static async updateAvailableBooks(count: number) {
    await this.setGauge("metrics:books:available:current", count);
  }

  static async updatePendingRequests(count: number) {
    await this.setGauge("metrics:requests:pending:current", count);
  }

  static async updateOverdueBooks(count: number) {
    await this.setGauge("metrics:books:overdue:current", count);
  }

  // Get metrics for monitoring dashboard
  static async getMetrics() {
    try {
      const keys = await redis.keys("metrics:*");
      const pipeline = redis.pipeline();

      keys.forEach((key) => {
        pipeline.get(key);
      });

      const values = await pipeline.exec();
      const metrics: Record<string, any> = {};

      keys.forEach((key, index) => {
        metrics[key] = values[index];
      });

      return metrics;
    } catch (error) {
      console.error("Failed to get metrics:", error);
      return {};
    }
  }

  // Get recent alerts
  static async getRecentAlerts(limit = 50) {
    try {
      const alertKeys = await redis.keys("alerts:*");
      const pipeline = redis.pipeline();

      alertKeys.forEach((key) => {
        pipeline.get(key);
      });

      const alertData = await pipeline.exec();
      const alerts = alertKeys
        .map((key, index) => {
          const data = alertData[index];
          return {
            key,
            ...(typeof data === "object" && data !== null ? data : {}),
          };
        })
        .filter((alert: any) => alert.timestamp)
        .sort(
          (a: any, b: any) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, limit);

      return alerts;
    } catch (error) {
      console.error("Failed to get recent alerts:", error);
      return [];
    }
  }
}

/**
 * Invariant checker for data consistency
 */
export class InvariantChecker {
  static async checkInventoryConsistency() {
    try {
      // This would be run periodically to check for data inconsistencies
      // Implementation would query the database to verify:
      // 1. available_copies >= 0 for all books
      // 2. Sum of borrowed books doesn't exceed total copies
      // 3. No duplicate active borrow records for same user/book

      console.log("Running inventory consistency check...");
      // TODO: Implement actual checks with database queries
    } catch (error) {
      console.error("Invariant check failed:", error);
      await LibraryMetrics.alertInventoryViolation("UNKNOWN", -999);
    }
  }
}
