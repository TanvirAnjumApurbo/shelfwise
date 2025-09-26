import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserBorrowingStatus } from "@/lib/services/user-restriction-service";
import { getUserFineStatus } from "@/lib/services/fine-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { userId } = params;

    // Users can only access their own status, admins can access anyone's
    if (session.user.role !== "ADMIN" && session.user.id !== userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Get borrowing status
    const borrowingStatus = await getUserBorrowingStatus(userId);
    if (!borrowingStatus.success) {
      return NextResponse.json(
        { success: false, error: borrowingStatus.error },
        { status: 500 }
      );
    }

    // Get detailed fine information
    const fineStatus = await getUserFineStatus(userId);
    if (!fineStatus.success) {
      return NextResponse.json(
        { success: false, error: fineStatus.error },
        { status: 500 }
      );
    }

    // Combine the data
    const combinedData = {
      ...borrowingStatus.data,
      activeFines: fineStatus.data?.activeFines || [],
    };

    return NextResponse.json({
      success: true,
      data: combinedData,
    });
  } catch (error) {
    console.error("Error in user status API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
