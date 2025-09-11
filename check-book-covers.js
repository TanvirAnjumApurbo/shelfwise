// Check book cover URLs from the database to identify the issue

const db = require("./database/drizzle").db;
const { books } = require("./database/schema");

async function checkBookCoverUrls() {
  console.log("🔍 Checking book cover URLs...");

  try {
    const allBooks = await db
      .select({
        id: books.id,
        title: books.title,
        coverUrl: books.coverUrl,
      })
      .from(books)
      .limit(10);

    console.log("\n📚 Book Cover URLs:");
    allBooks.forEach((book, index) => {
      console.log(`${index + 1}. ${book.title}`);
      console.log(`   📸 Cover URL: ${book.coverUrl}`);
      console.log(
        `   🔗 Type: ${
          book.coverUrl.startsWith("http") ? "Remote URL" : "Local Path"
        }`
      );
      console.log("");
    });

    const localPaths = allBooks.filter(
      (book) => !book.coverUrl.startsWith("http")
    );
    const remotePaths = allBooks.filter((book) =>
      book.coverUrl.startsWith("http")
    );

    console.log(`📊 Summary:`);
    console.log(`   - Remote URLs (working): ${remotePaths.length}`);
    console.log(`   - Local paths (potentially broken): ${localPaths.length}`);

    if (localPaths.length > 0) {
      console.log("\n❌ Local paths found that may not exist:");
      localPaths.forEach((book) => {
        console.log(`   - ${book.coverUrl} (for "${book.title}")`);
      });
    }

    console.log("\n💡 Solution: Either:");
    console.log(
      "   1. Create missing folders and copy image files to public/books/covers/"
    );
    console.log("   2. Update local paths to use ImageKit URLs");
    console.log("   3. Add fallback/placeholder images for missing covers");
  } catch (error) {
    console.error("❌ Error checking book covers:", error.message);
    console.log("\n💡 This might be because:");
    console.log("   - Database connection failed");
    console.log("   - Modules not available in this environment");
    console.log("   - Need to run this in the Next.js environment");
  }
}

checkBookCoverUrls();
