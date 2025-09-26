import { db } from "./database/drizzle";
import { users } from "./database/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const createTestUsers = async () => {
  try {
    console.log("Creating diverse test users...");

    // Test users with different statuses and roles
    const testUsers = [
      {
        fullName: "Admin User",
        email: "admin@university.edu",
        universityId: 99999999,
        password: "admin123",
        universityCard: "admin-card.jpg",
        status: "APPROVED" as const,
        role: "ADMIN" as const,
        totalFinesOwed: "0.00",
        isRestricted: false,
      },
      {
        fullName: "John Smith",
        email: "john.smith@student.edu",
        universityId: 20240001,
        password: "student123",
        universityCard: "john-card.jpg",
        status: "APPROVED" as const,
        role: "USER" as const,
        totalFinesOwed: "25.50",
        isRestricted: false,
      },
      {
        fullName: "Emily Johnson",
        email: "emily.johnson@student.edu",
        universityId: 20240002,
        password: "student123",
        universityCard: "emily-card.jpg",
        status: "PENDING" as const,
        role: "USER" as const,
        totalFinesOwed: "0.00",
        isRestricted: false,
      },
      {
        fullName: "Michael Brown",
        email: "michael.brown@student.edu",
        universityId: 20240003,
        password: "student123",
        universityCard: "michael-card.jpg",
        status: "APPROVED" as const,
        role: "USER" as const,
        totalFinesOwed: "150.00",
        isRestricted: true,
        restrictionReason: "Excessive overdue books and unpaid fines",
        restrictedAt: new Date("2024-01-15"),
      },
      {
        fullName: "Sarah Davis",
        email: "sarah.davis@student.edu",
        universityId: 20240004,
        password: "student123",
        universityCard: "sarah-card.jpg",
        status: "REJECTED" as const,
        role: "USER" as const,
        totalFinesOwed: "0.00",
        isRestricted: false,
      },
      {
        fullName: "David Wilson",
        email: "david.wilson@student.edu",
        universityId: 20240005,
        password: "student123",
        universityCard: "david-card.jpg",
        status: "APPROVED" as const,
        role: "USER" as const,
        totalFinesOwed: "5.25",
        isRestricted: false,
      },
      {
        fullName: "Lisa Anderson",
        email: "lisa.anderson@faculty.edu",
        universityId: 20240006,
        password: "faculty123",
        universityCard: "lisa-card.jpg",
        status: "APPROVED" as const,
        role: "USER" as const,
        totalFinesOwed: "0.00",
        isRestricted: false,
      },
      {
        fullName: "Robert Taylor",
        email: "robert.taylor@student.edu",
        universityId: 20240007,
        password: "student123",
        universityCard: "robert-card.jpg",
        status: "APPROVED" as const,
        role: "USER" as const,
        totalFinesOwed: "75.00",
        isRestricted: true,
        restrictionReason: "Multiple overdue returns without proper notice",
        restrictedAt: new Date("2024-02-01"),
      },
      {
        fullName: "Jennifer Martinez",
        email: "jennifer.martinez@student.edu",
        universityId: 20240008,
        password: "student123",
        universityCard: "jennifer-card.jpg",
        status: "PENDING" as const,
        role: "USER" as const,
        totalFinesOwed: "0.00",
        isRestricted: false,
      },
      {
        fullName: "Assistant Admin",
        email: "assistant@university.edu",
        universityId: 99999998,
        password: "assistant123",
        universityCard: "assistant-card.jpg",
        status: "APPROVED" as const,
        role: "ADMIN" as const,
        totalFinesOwed: "0.00",
        isRestricted: false,
      },
    ];

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existingUser.length > 0) {
        console.log(`ℹ️ User ${userData.fullName} already exists, skipping...`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const newUser = await db
        .insert(users)
        .values({
          ...userData,
          password: hashedPassword,
        })
        .returning();

      console.log(
        `✅ Created user: ${newUser[0].fullName} (${newUser[0].role})`
      );
    }

    console.log("🎉 Test users creation completed!");

    // Show statistics
    const stats = await db
      .select({
        total: users.id,
        status: users.status,
        role: users.role,
        isRestricted: users.isRestricted,
      })
      .from(users);

    const summary = {
      total: stats.length,
      approved: stats.filter((u) => u.status === "APPROVED").length,
      pending: stats.filter((u) => u.status === "PENDING").length,
      rejected: stats.filter((u) => u.status === "REJECTED").length,
      admins: stats.filter((u) => u.role === "ADMIN").length,
      restricted: stats.filter((u) => u.isRestricted).length,
    };

    console.log("📊 Current user statistics:");
    console.log(`   Total users: ${summary.total}`);
    console.log(`   Approved: ${summary.approved}`);
    console.log(`   Pending: ${summary.pending}`);
    console.log(`   Rejected: ${summary.rejected}`);
    console.log(`   Admins: ${summary.admins}`);
    console.log(`   Restricted: ${summary.restricted}`);
  } catch (error) {
    console.error("❌ Error creating test users:", error);
  }
};

createTestUsers()
  .then(() => {
    console.log("✨ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
