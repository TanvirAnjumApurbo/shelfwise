import { db } from "@/database/drizzle";
import { books } from "@/database/schema";

const addTestBook = async () => {
  try {
    const testBook = {
      title: "CSS in Depth",
      author: "Keith J. Grant",
      genre: "Web Development",
      rating: "4.5",
      coverUrl:
        "https://ik.imagekit.io/pwd17k26p/books/covers/file_zIgYlIxcY.png",
      coverColor: "#1e2a4b",
      description:
        "CSS in Depth by Keith J. Grant is a comprehensive guide for web developers who want to go beyond the basics of CSS and master the intricacies of styling web pages.",
      totalCopies: 18,
      availableCopies: 16,
      videoUrl:
        "https://ik.imagekit.io/pwd17k26p/books/videos/file_O-O0Z_Vz5.png",
      summary: "A comprehensive guide to CSS for web developers.",
      publisher: "Manning Publications",
      language: "English",
      isbn: "978-1617293450",
    };

    await db.insert(books).values(testBook);
    console.log("Test book added successfully!");
  } catch (error) {
    console.error("Error adding test book:", error);
  }
};

addTestBook();
