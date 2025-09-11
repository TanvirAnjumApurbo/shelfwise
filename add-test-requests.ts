// Test script to add account request data
import { users } from "./database/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql });

const addTestAccountRequests = async () => {
  console.log("Adding test account requests...");

  try {
    const testRequests = [
      {
        email: "john.doe@university.edu",
        fullName: "John Doe",
        universityId: 12345678,
        password: "password123", // Temporary password for testing
        universityCard:
          "https://via.placeholder.com/600x400/0088CC/FFFFFF?text=John+Doe+ID+Card",
        status: "PENDING" as const,
      },
      {
        email: "jane.smith@university.edu",
        fullName: "Jane Smith",
        universityId: 87654321,
        password: "password123",
        universityCard: "https://picsum.photos/600/400",
        status: "PENDING" as const,
      },
      {
        email: "bob.wilson@university.edu",
        fullName: "Bob Wilson",
        universityId: 11223344,
        password: "password123",
        universityCard:
          "https://placehold.co/600x400/FF6B6B/FFFFFF?text=Bob+Wilson+Student+ID",
        status: "PENDING" as const,
      },
      {
        email: "alice.brown@university.edu",
        fullName: "Alice Brown",
        universityId: 44332211,
        password: "password123",
        universityCard: "https://example.com/nonexistent.jpg", // This will test error handling
        status: "PENDING" as const,
      },
    ];

    for (const request of testRequests) {
      await db.insert(users).values(request);
      console.log(`Added test request for ${request.fullName}`);
    }

    console.log("Test account requests added successfully!");
  } catch (error) {
    console.error("Error adding test requests:", error);
  }
};

addTestAccountRequests().catch(console.error);
