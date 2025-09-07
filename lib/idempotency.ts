import { Redis } from "@upstash/redis";
import { LibraryMetrics } from "./metrics";
import { FeatureFlags, isFeatureEnabled } from "./feature-flags";

const redis = Redis.fromEnv();

/**
 * Idempotency key management for ensuring operations are not duplicated
 */
export class IdempotencyManager {
  private static readonly KEY_PREFIX = "idempotency:";
  private static readonly DEFAULT_TTL = 24 * 60 * 60; // 24 hours in seconds

  /**
   * Generate a consistent idempotency key based on operation and parameters
   */
  static generateKey(operation: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);

    const paramString = JSON.stringify(sortedParams);
    return `${this.KEY_PREFIX}${operation}:${Buffer.from(paramString).toString(
      "base64"
    )}`;
  }

  /**
   * Check if an operation has already been processed
   */
  static async checkOperation(
    operation: string,
    params: Record<string, any>,
    customKey?: string
  ): Promise<{ isProcessed: boolean; result?: any }> {
    if (!isFeatureEnabled("ENABLE_IDEMPOTENCY")) {
      return { isProcessed: false };
    }

    try {
      const key = customKey || this.generateKey(operation, params);
      const result = await redis.get(key);

      if (result) {
        await LibraryMetrics.recordIdempotencyHit();
        return { isProcessed: true, result };
      }

      return { isProcessed: false };
    } catch (error) {
      console.error("Failed to check idempotency:", error);
      // On Redis failure, allow the operation to proceed
      return { isProcessed: false };
    }
  }

  /**
   * Store the result of an operation to prevent duplication
   */
  static async storeResult(
    operation: string,
    params: Record<string, any>,
    result: any,
    customKey?: string,
    ttlSeconds = this.DEFAULT_TTL
  ): Promise<void> {
    if (!isFeatureEnabled("ENABLE_IDEMPOTENCY")) {
      return;
    }

    try {
      const key = customKey || this.generateKey(operation, params);

      const storeData = {
        result,
        timestamp: new Date().toISOString(),
        operation,
        params,
      };

      await redis.setex(key, ttlSeconds, storeData);
    } catch (error) {
      console.error("Failed to store idempotency result:", error);
      // Don't throw error - this is not critical for operation success
    }
  }

  /**
   * Wrapper function to make any operation idempotent
   */
  static async executeIdempotent<T>(
    operation: string,
    params: Record<string, any>,
    operationFunction: () => Promise<T>,
    customKey?: string,
    ttlSeconds = this.DEFAULT_TTL
  ): Promise<T> {
    // Check if already processed
    const check = await this.checkOperation(operation, params, customKey);

    if (check.isProcessed) {
      console.log(
        `Operation ${operation} already processed, returning cached result`
      );
      return check.result;
    }

    // Execute the operation
    const result = await operationFunction();

    // Store the result
    await this.storeResult(operation, params, result, customKey, ttlSeconds);

    return result;
  }

  /**
   * Clear idempotency cache for an operation (useful for testing or manual intervention)
   */
  static async clearOperation(
    operation: string,
    params: Record<string, any>,
    customKey?: string
  ): Promise<void> {
    try {
      const key = customKey || this.generateKey(operation, params);
      await redis.del(key);
    } catch (error) {
      console.error("Failed to clear idempotency cache:", error);
    }
  }

  /**
   * Get statistics about idempotency usage
   */
  static async getStats(): Promise<{
    totalKeys: number;
    sampleKeys: string[];
  }> {
    try {
      const keys = await redis.keys(`${this.KEY_PREFIX}*`);
      const sampleKeys = keys.slice(0, 10); // Get sample of keys

      return {
        totalKeys: keys.length,
        sampleKeys,
      };
    } catch (error) {
      console.error("Failed to get idempotency stats:", error);
      return { totalKeys: 0, sampleKeys: [] };
    }
  }
}

/**
 * Specific idempotency helpers for common operations
 */
export class BorrowRequestIdempotency {
  static async createRequest(
    userId: string,
    bookId: string,
    confirmationText: string,
    operationFunction: () => Promise<any>,
    userProvidedKey?: string
  ) {
    const operation = "CREATE_BORROW_REQUEST";
    const params = { userId, bookId, confirmationText };

    // Use user-provided key if available, otherwise generate one
    const idempotencyKey =
      userProvidedKey || IdempotencyManager.generateKey(operation, params);

    return IdempotencyManager.executeIdempotent(
      operation,
      params,
      operationFunction,
      idempotencyKey,
      24 * 60 * 60 // 24 hours TTL
    );
  }

  static async approveRequest(
    requestId: string,
    adminId: string,
    operationFunction: () => Promise<any>
  ) {
    const operation = "APPROVE_BORROW_REQUEST";
    const params = { requestId, adminId };

    return IdempotencyManager.executeIdempotent(
      operation,
      params,
      operationFunction,
      undefined,
      48 * 60 * 60 // 48 hours TTL for admin operations
    );
  }

  static async rejectRequest(
    requestId: string,
    adminId: string,
    operationFunction: () => Promise<any>
  ) {
    const operation = "REJECT_BORROW_REQUEST";
    const params = { requestId, adminId };

    return IdempotencyManager.executeIdempotent(
      operation,
      params,
      operationFunction,
      undefined,
      48 * 60 * 60 // 48 hours TTL for admin operations
    );
  }
}

export class ReturnRequestIdempotency {
  static async createRequest(
    userId: string,
    borrowRecordId: string,
    operationFunction: () => Promise<any>
  ) {
    const operation = "CREATE_RETURN_REQUEST";
    const params = { userId, borrowRecordId };

    return IdempotencyManager.executeIdempotent(
      operation,
      params,
      operationFunction,
      undefined,
      24 * 60 * 60 // 24 hours TTL
    );
  }

  static async approveRequest(
    requestId: string,
    adminId: string,
    operationFunction: () => Promise<any>
  ) {
    const operation = "APPROVE_RETURN_REQUEST";
    const params = { requestId, adminId };

    return IdempotencyManager.executeIdempotent(
      operation,
      params,
      operationFunction,
      undefined,
      48 * 60 * 60 // 48 hours TTL for admin operations
    );
  }
}

export class NotificationIdempotency {
  static async subscribe(
    userId: string,
    bookId: string,
    operationFunction: () => Promise<any>
  ) {
    const operation = "SUBSCRIBE_NOTIFICATION";
    const params = { userId, bookId };

    return IdempotencyManager.executeIdempotent(
      operation,
      params,
      operationFunction,
      undefined,
      6 * 60 * 60 // 6 hours TTL for subscriptions
    );
  }
}
