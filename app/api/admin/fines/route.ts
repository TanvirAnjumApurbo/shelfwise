import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { calculateOverdueFines } from "@/lib/services/fine-service";
import { processDailyFineCalculation } from "@/lib/background-jobs";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Only admins can trigger fine calculations
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    const { action } = await request.json();

    switch (action) {
      case "calculate_fines":
        const result = await calculateOverdueFines();
        return NextResponse.json(result);

      case "daily_job":
        const jobResult = await processDailyFineCalculation();
        return NextResponse.json(jobResult);

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in fines API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
