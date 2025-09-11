"use server";

import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq, desc } from "drizzle-orm";
import { sendEmail } from "@/lib/workflow";
import { createAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

interface ApproveAccountRequestParams {
  userId: string;
  adminId: string;
  adminNotes?: string;
}

interface RejectAccountRequestParams {
  userId: string;
  adminId: string;
  adminNotes?: string;
}

// Get all pending account requests
export const getPendingAccountRequests = async () => {
  try {
    const requests = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        universityId: users.universityId,
        universityCard: users.universityCard,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.status, "PENDING"))
      .orderBy(desc(users.createdAt));

    return {
      success: true,
      data: requests,
    };
  } catch (error) {
    console.error("Error fetching pending account requests:", error);
    return {
      success: false,
      error: "An error occurred while fetching account requests",
    };
  }
};

// Admin: Approve account request
export const approveAccountRequest = async (
  params: ApproveAccountRequestParams
) => {
  const { userId, adminId, adminNotes } = params;

  try {
    // Get the user details
    const userDetails = await db
      .select({
        fullName: users.fullName,
        email: users.email,
        universityId: users.universityId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userDetails.length) {
      return {
        success: false,
        error: "User not found",
      };
    }

    const user = userDetails[0];

    // Update user status to APPROVED
    const [updatedUser] = await db
      .update(users)
      .set({
        status: "APPROVED",
      })
      .where(eq(users.id, userId))
      .returning();

    // Create audit log
    await createAuditLog({
      action: "ADMIN_ACTION",
      actorType: "ADMIN",
      actorId: adminId,
      targetUserId: userId,
      metadata: {
        action: "APPROVE_ACCOUNT",
        adminNotes: adminNotes || "",
      },
    });

    // Send approval email
    try {
      await sendEmail({
        email: user.email,
        subject: "Account Approved - Welcome to ShelfWise Library",
        message: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Account Approved!</h2>
            <p>Dear ${user.fullName},</p>
            
            <p>Congratulations! Your ShelfWise Library account has been approved.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">Account Details:</h3>
              <p><strong>Full Name:</strong> ${user.fullName}</p>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>University ID:</strong> ${user.universityId}</p>
            </div>
            
            <p>You can now:</p>
            <ul>
              <li>Browse and search our extensive book collection</li>
              <li>Request to borrow books</li>
              <li>Manage your borrowed books</li>
              <li>Set up book availability notifications</li>
            </ul>
            
            <p>Visit our library at <a href="${
              process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
            }" style="color: #2563eb;">ShelfWise Library</a> to get started.</p>
            
            ${
              adminNotes
                ? `<div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Admin Note:</strong> ${adminNotes}</p>
            </div>`
                : ""
            }
            
            <p>Welcome to the ShelfWise community!</p>
            
            <p>Best regards,<br>The ShelfWise Library Team</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send approval email:", emailError);
      // Don't fail the request if email fails
    }

    revalidatePath("/admin");
    revalidatePath("/admin/account-requests");

    return {
      success: true,
      data: updatedUser,
    };
  } catch (error) {
    console.error("Error approving account request:", error);
    return {
      success: false,
      error: "An error occurred while approving the account",
    };
  }
};

// Admin: Reject account request
export const rejectAccountRequest = async (
  params: RejectAccountRequestParams
) => {
  const { userId, adminId, adminNotes } = params;

  try {
    // Get the user details
    const userDetails = await db
      .select({
        fullName: users.fullName,
        email: users.email,
        universityId: users.universityId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userDetails.length) {
      return {
        success: false,
        error: "User not found",
      };
    }

    const user = userDetails[0];

    // Update user status to REJECTED
    const [updatedUser] = await db
      .update(users)
      .set({
        status: "REJECTED",
      })
      .where(eq(users.id, userId))
      .returning();

    // Create audit log
    await createAuditLog({
      action: "ADMIN_ACTION",
      actorType: "ADMIN",
      actorId: adminId,
      targetUserId: userId,
      metadata: {
        action: "REJECT_ACCOUNT",
        adminNotes: adminNotes || "",
      },
    });

    // Send rejection email
    try {
      await sendEmail({
        email: user.email,
        subject: "Account Application Update - ShelfWise Library",
        message: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Account Application Update</h2>
            <p>Dear ${user.fullName},</p>
            
            <p>Thank you for your interest in joining ShelfWise Library. After reviewing your application, we regret to inform you that your account cannot be approved at this time.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">Application Details:</h3>
              <p><strong>Full Name:</strong> ${user.fullName}</p>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>University ID:</strong> ${user.universityId}</p>
            </div>
            
            ${
              adminNotes
                ? `<div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Reason:</strong> ${adminNotes}</p>
            </div>`
                : ""
            }
            
            <p>If you believe this is an error or would like to reapply, please contact our support team or submit a new application with the correct information.</p>
            
            <p>Thank you for your understanding.</p>
            
            <p>Best regards,<br>The ShelfWise Library Team</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send rejection email:", emailError);
      // Don't fail the request if email fails
    }

    revalidatePath("/admin");
    revalidatePath("/admin/account-requests");

    return {
      success: true,
      data: updatedUser,
    };
  } catch (error) {
    console.error("Error rejecting account request:", error);
    return {
      success: false,
      error: "An error occurred while rejecting the account",
    };
  }
};
