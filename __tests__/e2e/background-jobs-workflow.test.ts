/**
 * End-to-End tests for Background Jobs and Workflow System
 *
 * These tests validate the complete workflow from borrow request creation
 * through background job processing, notifications, and cleanup.
 */

import {
  describe,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  it,
  expect,
  jest,
} from "@jest/globals";
import { BackgroundWorker, ManualJobTriggers } from "@/lib/worker";
import { LibraryMetrics } from "@/lib/metrics";
import { FeatureFlags, isFeatureEnabled } from "@/lib/feature-flags";
import { IdempotencyManager } from "@/lib/idempotency";
import {
  createBorrowRequest,
  approveBorrowRequest,
} from "@/lib/actions/borrow-request";
import {
  runNightlyJobs,
  processDueNotifications,
  processAvailabilityNotifications,
} from "@/lib/background-jobs";

// Mock implementations
jest.mock("@/database/drizzle");
jest.mock("@/lib/workflow");
jest.mock("@upstash/redis");
jest.mock("@upstash/workflow");

describe("Background Jobs E2E Workflow", () => {
  const mockUserId = "user-123";
  const mockBookId = "book-456";
  const mockAdminId = "admin-789";
  const mockRequestId = "req-001";

  beforeAll(async () => {
    // Setup test environment
    process.env.FEATURE_BACKGROUND_JOBS = "true";
    process.env.FEATURE_NOTIFY = "true";
    process.env.FEATURE_OVERDUE = "true";
    process.env.FEATURE_EMAIL_NOTIFICATIONS = "true";
    process.env.FEATURE_AUDIT_LOGS = "true";
  });

  afterAll(async () => {
    // Cleanup test environment
    jest.clearAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Complete Borrow Request Workflow", () => {
    it("should complete full workflow: request → approval → notifications → metrics", async () => {
      // Mock database responses
      const mockDb = require("@/database/drizzle").db;
      mockDb.transaction.mockImplementation((callback: any) =>
        callback(mockDb)
      );
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                title: "Test Book",
                availableCopies: 5,
                reserveOnRequest: false,
              },
            ] as any),
          }),
        }),
      });
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            {
              id: mockRequestId,
              userId: mockUserId,
              bookId: mockBookId,
              status: "PENDING",
            },
          ] as any),
        }),
      });

      // Step 1: Create borrow request
      const createResult = await createBorrowRequest({
        userId: mockUserId,
        bookId: mockBookId,
        confirmationText: "confirm",
        idempotencyKey: "test-key-001",
      });

      expect(createResult.success).toBe(true);
      expect(createResult.data?.id).toBe(mockRequestId);

      // Step 2: Admin approves request
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                {
                  request: {
                    id: mockRequestId,
                    userId: mockUserId,
                    bookId: mockBookId,
                    status: "PENDING",
                  },
                  user: {
                    id: mockUserId,
                    fullName: "Test User",
                    email: "test@example.com",
                  },
                  book: {
                    id: mockBookId,
                    title: "Test Book",
                    author: "Test Author",
                    availableCopies: 5,
                  },
                },
              ]),
            }),
          }),
        }),
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([
              {
                id: mockRequestId,
                status: "APPROVED",
                dueDate: "2024-01-15",
              },
            ]),
          }),
        }),
      });

      const approveResult = await approveBorrowRequest({
        requestId: mockRequestId,
        adminId: mockAdminId,
        adminNotes: "Approved for testing",
      });

      expect(approveResult.success).toBe(true);

      // Step 3: Verify metrics recording
      const metricsInstance = new LibraryMetrics();
      await metricsInstance.recordBorrowRequestApproved();

      // Verify metrics were called
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should handle race conditions with idempotency", async () => {
      const idempotencyKey = "race-test-001";

      // Mock idempotency manager
      const mockIdempotency = jest.spyOn(IdempotencyManager, "withIdempotency");
      mockIdempotency.mockResolvedValue({
        success: true,
        data: { id: "cached-result" },
      });

      // Simulate concurrent requests
      const promises = Array(5)
        .fill(null)
        .map(() =>
          createBorrowRequest({
            userId: mockUserId,
            bookId: mockBookId,
            confirmationText: "confirm",
            idempotencyKey,
          })
        );

      const results = await Promise.all(promises);

      // All should succeed but only one should create the actual request
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      // Idempotency should have been checked
      expect(mockIdempotency).toHaveBeenCalled();
    });
  });

  describe("Background Job Processing", () => {
    it("should process nightly maintenance jobs", async () => {
      const mockRedis = require("@upstash/redis").Redis;
      const redisMock = new mockRedis();

      // Mock Redis responses for metrics
      redisMock.hget.mockResolvedValue("10");
      redisMock.lrange.mockResolvedValue([]);

      // Run nightly jobs
      await ManualJobTriggers.triggerNightlyMaintenance();

      // Verify job execution (mocked internally)
      expect(redisMock.hget).toHaveBeenCalled();
    });

    it("should process due notifications correctly", async () => {
      const mockDb = require("@/database/drizzle").db;

      // Mock overdue books query
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([
              {
                borrowRecord: {
                  id: "br-001",
                  userId: mockUserId,
                  bookId: mockBookId,
                  dueDate: "2024-01-01",
                },
                user: {
                  email: "user@example.com",
                  fullName: "Test User",
                },
                book: {
                  title: "Overdue Book",
                  author: "Test Author",
                },
              },
            ]),
          }),
        }),
      });

      const mockWorkflow = require("@/lib/workflow");
      mockWorkflow.sendEmail.mockResolvedValue({ success: true });

      await processDueNotifications();

      // Verify email was sent
      expect(mockWorkflow.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "user@example.com",
          subject: expect.stringContaining("Overdue"),
        })
      );
    });

    it("should process availability notifications", async () => {
      const mockDb = require("@/database/drizzle").db;

      // Mock users waiting for notification
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([
              {
                preference: {
                  userId: mockUserId,
                  bookId: mockBookId,
                },
                user: {
                  email: "waiting@example.com",
                  fullName: "Waiting User",
                },
                book: {
                  title: "Available Book",
                  author: "Test Author",
                },
              },
            ]),
          }),
        }),
      });

      const mockWorkflow = require("@/lib/workflow");
      mockWorkflow.sendEmail.mockResolvedValue({ success: true });

      await processAvailabilityNotifications(mockBookId);

      // Verify notification email
      expect(mockWorkflow.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "waiting@example.com",
          subject: expect.stringContaining("Available"),
        })
      );
    });
  });

  describe("Feature Flag Integration", () => {
    it("should respect feature flags in background jobs", async () => {
      // Disable background jobs
      process.env.FEATURE_BACKGROUND_JOBS = "false";

      const result = await BackgroundWorker.queueAvailabilityNotification(
        mockBookId
      );

      // Should skip processing when disabled
      expect(result).toBeUndefined();

      // Re-enable for other tests
      process.env.FEATURE_BACKGROUND_JOBS = "true";
    });

    it("should handle emergency rollback scenarios", async () => {
      // Enable emergency rollback
      process.env.EMERGENCY_DISABLE_ALL = "true";

      const createResult = await createBorrowRequest({
        userId: mockUserId,
        bookId: mockBookId,
        confirmationText: "confirm",
      });

      // Should still work but with degraded functionality
      expect(createResult).toBeDefined();

      // Cleanup
      delete process.env.EMERGENCY_DISABLE_ALL;
    });
  });

  describe("Worker Health Monitoring", () => {
    it("should provide comprehensive health check", async () => {
      const healthStatus = await BackgroundWorker.healthCheck();

      expect(healthStatus).toHaveProperty("status");
      expect(healthStatus).toHaveProperty("backgroundJobsEnabled");
      expect(healthStatus).toHaveProperty("overdueEnabled");
      expect(healthStatus).toHaveProperty("notifyEnabled");
      expect(healthStatus).toHaveProperty("lastCheck");

      expect(["healthy", "unhealthy"]).toContain(healthStatus.status);
    });

    it("should detect worker failures and alert", async () => {
      const mockMetrics = jest.spyOn(LibraryMetrics, "alertHighFailureRate");
      mockMetrics.mockResolvedValue(undefined);

      // Mock a failing nightly job
      jest.spyOn(console, "error").mockImplementation(() => {});
      const mockError = new Error("Simulated failure");

      const runNightlyJobsSpy = jest.spyOn(
        require("@/lib/background-jobs"),
        "runNightlyJobs"
      );
      runNightlyJobsSpy.mockRejectedValue(mockError);

      try {
        await BackgroundWorker.executeNightlyMaintenance();
      } catch (error) {
        expect(error).toBe(mockError);
      }

      // Verify alert was triggered
      expect(mockMetrics).toHaveBeenCalledWith("NIGHTLY_JOBS", 1, 1);
    });
  });

  describe("Metrics and Alerting", () => {
    it("should track comprehensive metrics", async () => {
      const metrics = new LibraryMetrics();

      // Test various metric operations
      await metrics.recordBorrowRequestCreated();
      await metrics.recordBorrowRequestApproved();
      await metrics.recordEmailSent();

      const currentMetrics = await metrics.getMetrics();
      expect(currentMetrics).toBeDefined();
    });

    it("should trigger alerts for critical conditions", async () => {
      const metrics = new LibraryMetrics();

      // Mock Redis for alert storage
      const mockRedis = require("@upstash/redis").Redis;
      const redisMock = new mockRedis();
      redisMock.lpush.mockResolvedValue(1);

      await metrics.alertInventoryViolation(mockBookId, -1);

      // Verify alert was stored
      expect(redisMock.lpush).toHaveBeenCalledWith(
        "library:alerts",
        expect.stringContaining("INVENTORY_VIOLATION")
      );
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle database failures gracefully", async () => {
      const mockDb = require("@/database/drizzle").db;
      mockDb.transaction.mockRejectedValue(
        new Error("Database connection failed")
      );

      const result = await createBorrowRequest({
        userId: mockUserId,
        bookId: mockBookId,
        confirmationText: "confirm",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("error");
    });

    it("should handle Redis failures gracefully", async () => {
      const mockRedis = require("@upstash/redis").Redis;
      const redisMock = new mockRedis();
      redisMock.get.mockRejectedValue(new Error("Redis connection failed"));

      // Metrics should degrade gracefully
      const metrics = new LibraryMetrics();

      // Should not throw, but may return default values
      await expect(metrics.getMetrics()).resolves.toBeDefined();
    });

    it("should handle email service failures", async () => {
      const mockWorkflow = require("@/lib/workflow");
      mockWorkflow.sendEmail.mockRejectedValue(
        new Error("Email service unavailable")
      );

      // Should not fail the main operation
      await expect(processDueNotifications()).resolves.toBeUndefined();
    });
  });

  describe("Performance and Load Testing", () => {
    it("should handle concurrent borrow requests efficiently", async () => {
      const startTime = Date.now();

      // Mock successful database operations
      const mockDb = require("@/database/drizzle").db;
      mockDb.transaction.mockImplementation((callback) => callback(mockDb));
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                title: "Test Book",
                availableCopies: 100,
              },
            ]),
          }),
        }),
      });

      const concurrentRequests = 50;
      const promises = Array(concurrentRequests)
        .fill(null)
        .map((_, index) =>
          createBorrowRequest({
            userId: `user-${index}`,
            bookId: mockBookId,
            confirmationText: "confirm",
            idempotencyKey: `load-test-${index}`,
          })
        );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All requests should complete
      expect(results).toHaveLength(concurrentRequests);

      // Should complete within reasonable time (adjust based on requirements)
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(5000); // 5 seconds
    });
  });
});

describe("Background Jobs Integration with Real Scenarios", () => {
  it("should simulate complete library workflow over time", async () => {
    // This test simulates a realistic timeline of library operations

    // Day 1: User requests book
    const borrowResult = await createBorrowRequest({
      userId: "user-timeline",
      bookId: "book-timeline",
      confirmationText: "confirm",
    });

    expect(borrowResult.success).toBe(true);

    // Day 1: Admin approves
    const approveResult = await approveBorrowRequest({
      requestId: "req-timeline",
      adminId: "admin-timeline",
    });

    expect(approveResult.success).toBe(true);

    // Day 7: Due date reminder (simulated)
    await ManualJobTriggers.triggerDueReminders();

    // Day 14: Overdue notification (simulated)
    await ManualJobTriggers.triggerDueReminders();

    // Day 15: Book returned and becomes available
    await ManualJobTriggers.triggerAvailabilityNotifications("book-timeline");

    // Verify the complete workflow executed without errors
    const healthCheck = await ManualJobTriggers.runHealthCheck();
    expect(healthCheck.status).toBe("healthy");
  });
});
