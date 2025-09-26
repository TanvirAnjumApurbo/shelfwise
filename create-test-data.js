// Create test admin user and borrow requests for testing the admin dashboard

const createTestData = async () => {
  try {
    console.log("Creating test admin user and borrow requests...");

    // Import bcrypt
    const bcrypt = require("bcryptjs");

    // Database connection
    const { neon } = require("@neondatabase/serverless");
    const { drizzle } = require("drizzle-orm/neon-http");
    const { users, books, borrowRequests } = require("./database/schema");
    const { eq, and } = require("drizzle-orm");

    require("dotenv").config({ path: ".env.local" });

    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle({ client: sql });

    // Create admin user if not exists
    const adminEmail = "admin@test.com";
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    let adminUser;
    if (existingAdmin.length === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const newAdmin = await db
        .insert(users)
        .values({
          fullName: "Test Admin",
          email: adminEmail,
          universityId: 99999999,
          password: hashedPassword,
          universityCard:
            "https://via.placeholder.com/400x300/0088CC/FFFFFF?text=Admin+Card",
          status: "APPROVED",
          role: "ADMIN",
        })
        .returning();

      adminUser = newAdmin[0];
      console.log("✅ Created admin user:", adminUser.fullName);
    } else {
      adminUser = existingAdmin[0];
      console.log("ℹ️ Admin user already exists:", adminUser.fullName);
    }

    // Create regular test user if not exists
    const testUserEmail = "user@test.com";
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, testUserEmail))
      .limit(1);

    let testUser;
    if (existingUser.length === 0) {
      const hashedPassword = await bcrypt.hash("user123", 10);
      const newUser = await db
        .insert(users)
        .values({
          fullName: "John Doe",
          email: testUserEmail,
          universityId: 12345678,
          password: hashedPassword,
          universityCard:
            "https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Student+Card",
          status: "APPROVED",
          role: "USER",
        })
        .returning();

      testUser = newUser[0];
      console.log("✅ Created test user:", testUser.fullName);
    } else {
      testUser = existingUser[0];
      console.log("ℹ️ Test user already exists:", testUser.fullName);
    }

    // Get some books
    const testBooks = await db.select().from(books).limit(3);
    if (testBooks.length === 0) {
      console.log("❌ No books found. Please run the seed script first.");
      return;
    }

    console.log(
      "📚 Found books:",
      testBooks.map((b) => b.title)
    );

    // Create test borrow requests
    const testRequests = [
      {
        userId: testUser.id,
        bookId: testBooks[0].id,
        status: "PENDING",
      },
    ];

    if (testBooks.length > 1) {
      testRequests.push({
        userId: testUser.id,
        bookId: testBooks[1].id,
        status: "PENDING",
      });
    }

    for (const request of testRequests) {
      // Check if request already exists
      const existing = await db
        .select()
        .from(borrowRequests)
        .where(
          and(
            eq(borrowRequests.userId, request.userId),
            eq(borrowRequests.bookId, request.bookId),
            eq(borrowRequests.status, "PENDING")
          )
        );

      if (existing.length === 0) {
        const result = await db
          .insert(borrowRequests)
          .values(request)
          .returning();
        console.log(`✅ Created borrow request: ${result[0].id}`);
      } else {
        console.log(`⚠️ Borrow request already exists`);
      }
    }

    console.log("🎉 Test data created successfully!");
    console.log("");
    console.log("🔑 Admin Login:");
    console.log("   Email: admin@test.com");
    console.log("   Password: admin123");
    console.log("");
    console.log("👤 Test User Login:");
    console.log("   Email: user@test.com");
    console.log("   Password: user123");
    console.log("");
    console.log("📋 You can now:");
    console.log("   1. Login as admin");
    console.log("   2. Go to /admin/book-requests");
    console.log("   3. Check if book covers are displayed correctly");
  } catch (error) {
    console.error("❌ Error creating test data:", error);
  }
};

createTestData();
