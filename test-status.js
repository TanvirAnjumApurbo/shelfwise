// Test the status checking function directly (for manual testing)
// This would be used in a browser console or testing environment

const testBorrowStatus = async (userId, bookId) => {
  try {
    console.log(`Testing borrow status for user ${userId}, book ${bookId}`);

    const response = await fetch(
      `/api/borrow-status?userId=${userId}&bookId=${bookId}`
    );
    const data = await response.json();

    console.log("API Response:", data);

    if (data.success && data.data) {
      console.log("Status found:", data.data.status);
      console.log("Due date:", data.data.dueDate);
    } else {
      console.log("No active status found");
    }

    return data;
  } catch (error) {
    console.error("Error testing borrow status:", error);
  }
};

// Usage: testBorrowStatus('user-id', 'book-id')
console.log(
  "testBorrowStatus function loaded. Use testBorrowStatus(userId, bookId) to test."
);
