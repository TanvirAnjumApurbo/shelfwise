import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function createFineTables() {
  try {
    console.log("🔄 Creating fine-related tables...");

    // Create fine status enum
    console.log("📋 Creating fine_status enum...");
    await sql`
      DO $$ BEGIN
        CREATE TYPE fine_status AS ENUM ('PENDING', 'PAID', 'WAIVED', 'PARTIAL_PAID');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✅ fine_status enum created");

    // Create fine type enum
    console.log("📋 Creating fine_type enum...");
    await sql`
      DO $$ BEGIN
        CREATE TYPE fine_type AS ENUM ('LATE_RETURN', 'LOST_BOOK', 'DAMAGE_FEE', 'PROCESSING_FEE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✅ fine_type enum created");

    // Create penalty type enum
    console.log("📋 Creating penalty_type enum...");
    await sql`
      DO $$ BEGIN
        CREATE TYPE penalty_type AS ENUM ('FLAT_FEE', 'DAILY_FEE', 'LOST_BOOK_FEE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✅ penalty_type enum created");

    // Create fines table
    console.log("📋 Creating fines table...");
    await sql`
      CREATE TABLE IF NOT EXISTS fines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        book_id UUID NOT NULL REFERENCES books(id),
        borrow_record_id UUID NOT NULL REFERENCES borrow_records(id),
        fine_type fine_type NOT NULL,
        penalty_type penalty_type NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        paid_amount NUMERIC(10,2) DEFAULT 0.00 NOT NULL,
        status fine_status DEFAULT 'PENDING' NOT NULL,
        due_date DATE NOT NULL,
        calculation_date DATE NOT NULL,
        days_overdue NUMERIC(5,2) NOT NULL,
        is_book_lost BOOLEAN DEFAULT FALSE NOT NULL,
        description TEXT NOT NULL,
        admin_notes TEXT,
        paid_at TIMESTAMPTZ,
        waived_at TIMESTAMPTZ,
        waived_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `;
    console.log("✅ fines table created");

    // Create fine payments table
    console.log("📋 Creating fine_payments table...");
    await sql`
      CREATE TABLE IF NOT EXISTS fine_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fine_id UUID NOT NULL REFERENCES fines(id),
        user_id UUID NOT NULL REFERENCES users(id),
        amount NUMERIC(10,2) NOT NULL,
        payment_method VARCHAR(50),
        payment_reference VARCHAR(255),
        payment_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        admin_processed_by UUID REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `;
    console.log("✅ fine_payments table created");

    // Create indexes
    console.log("📋 Creating indexes...");
    await sql`CREATE INDEX IF NOT EXISTS idx_fines_user_id ON fines(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_fines_book_id ON fines(book_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_fines_borrow_record_id ON fines(borrow_record_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_fines_status ON fines(status)`;
    console.log("✅ All indexes created");

    // Create trigger for updated_at
    console.log("📋 Creating update trigger...");
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    await sql`
      DROP TRIGGER IF EXISTS update_fines_updated_at ON fines;
    `;

    await sql`
      CREATE TRIGGER update_fines_updated_at 
        BEFORE UPDATE ON fines
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    `;
    console.log("✅ Update trigger created");

    console.log("\n🎉 All fine-related tables created successfully!");
  } catch (error) {
    console.error("💥 Error creating fine tables:", error);
    process.exit(1);
  }
}

createFineTables()
  .then(() => {
    console.log("✨ Fine tables creation completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fine tables creation failed:", error);
    process.exit(1);
  });
