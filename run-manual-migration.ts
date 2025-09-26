import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function runManualMigration() {
  try {
    console.log("🔄 Running manual penalty system migration...");

    // Step 1: Add user fields for penalty system
    console.log("\n📋 Adding penalty system fields to users table...");

    const operations = [
      {
        name: "total_fines_owed",
        operation: () =>
          sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS total_fines_owed NUMERIC(10,2) DEFAULT 0.00 NOT NULL`,
      },
      {
        name: "is_restricted",
        operation: () =>
          sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN DEFAULT FALSE NOT NULL`,
      },
      {
        name: "restriction_reason",
        operation: () =>
          sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS restriction_reason TEXT`,
      },
      {
        name: "restricted_at",
        operation: () =>
          sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS restricted_at TIMESTAMPTZ`,
      },
      {
        name: "restricted_by",
        operation: () =>
          sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS restricted_by UUID`,
      },
      {
        name: "last_fine_calculation",
        operation: () =>
          sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_fine_calculation TIMESTAMPTZ`,
      },
    ];

    for (const op of operations) {
      try {
        await op.operation();
        console.log(`✅ Added field: ${op.name}`);
      } catch (error: any) {
        if (error.message?.includes("already exists")) {
          console.log(`⏭️  Field ${op.name} already exists`);
        } else {
          console.error(`❌ Error adding ${op.name}:`, error.message);
        }
      }
    }

    console.log("\n🎉 User table penalty fields added successfully!");
    console.log("💡 Now run: npm run db:migrate to create the penalty tables");
  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
}

runManualMigration()
  .then(() => {
    console.log("✨ Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Migration script failed:", error);
    process.exit(1);
  });
