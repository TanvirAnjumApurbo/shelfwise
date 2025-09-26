const { requestPasswordReset } = require("./lib/actions/auth.ts");

async function testForgotPassword() {
  try {
    console.log("Testing password reset with a test email...");

    // Use a test email - replace with an actual email in your database
    const result = await requestPasswordReset({
      email: "test@test.com", // Replace with a real email from your users table
    });

    console.log("Result:", result);
  } catch (error) {
    console.error("Error during password reset test:", error);
  }
}

testForgotPassword();
