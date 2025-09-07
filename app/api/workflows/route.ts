"use server";

import { NextRequest, NextResponse } from "next/server";
import { BackgroundWorker } from "@/lib/worker";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { LibraryMetrics } from "@/lib/metrics";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...params } = body;

    if (!isFeatureEnabled("ENABLE_BACKGROUND_JOBS")) {
      return NextResponse.json(
        { error: "Background jobs are disabled" },
        { status: 503 }
      );
    }

    switch (type) {
      case "NIGHTLY_MAINTENANCE":
        await BackgroundWorker.executeNightlyMaintenance();
        return NextResponse.json({
          success: true,
          message: "Nightly maintenance completed",
        });

      case "DUE_REMINDERS":
        await BackgroundWorker.queueDueReminderCheck();
        return NextResponse.json({
          success: true,
          message: "Due reminders processed",
        });

      case "AVAILABILITY_NOTIFICATION":
        if (!params.bookId) {
          return NextResponse.json(
            { error: "bookId is required" },
            { status: 400 }
          );
        }
        await BackgroundWorker.queueAvailabilityNotification(params.bookId);
        return NextResponse.json({
          success: true,
          message: "Availability notifications processed",
        });

      case "HEALTH_CHECK":
        const health = await BackgroundWorker.healthCheck();
        return NextResponse.json(health);

      default:
        return NextResponse.json(
          { error: "Unknown job type" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Background job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Health check endpoint
    const health = await BackgroundWorker.healthCheck();
    return NextResponse.json(health);
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      { status: "unhealthy", error: "Health check failed" },
      { status: 500 }
    );
  }
}
