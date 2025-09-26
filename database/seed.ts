import dummyBooks from "../dummybooks.json";
import { books } from "@/database/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql });

const seed = async () => {
  console.log("Seeding data...");

  try {
    // Check if books already exist
    const existingBooks = await db.select().from(books).limit(1);
    if (existingBooks.length > 0) {
      console.log(
        "Books already exist in database. Performing idempotent upsert instead."
      );
    }
    let inserted = 0;

    for (const book of dummyBooks) {
      const formattedRating = Number.isFinite(book.rating)
        ? book.rating.toFixed(1)
        : "0.0";

      const payload = {
        ...book,
        rating: formattedRating,
        coverUrl: book.coverUrl,
        videoUrl: book.videoUrl,
        availableCopies:
          book.availableCopies ??
          (typeof book.totalCopies === "number" ? book.totalCopies : 0),
      } satisfies typeof books.$inferInsert;

      await db
        .insert(books)
        .values(payload)
        .onConflictDoUpdate({
          target: books.id,
          set: {
            title: payload.title,
            author: payload.author,
            genre: payload.genre,
            rating: payload.rating,
            coverUrl: payload.coverUrl,
            coverColor: payload.coverColor,
            description: payload.description,
            totalCopies: payload.totalCopies,
            availableCopies: payload.availableCopies,
            videoUrl: payload.videoUrl,
            summary: payload.summary,
          },
        });

      inserted += 1;
    }

    console.log(`Data seeded successfully! Processed ${inserted} books.`);
  } catch (error) {
    console.error("Error seeding data:", error);
  }
};

seed();
