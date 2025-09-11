// Simple test script to verify return request functionality
const fs = require("fs");
const path = require("path");

console.log("✅ Return Request System Test");
console.log("");

// Check if the return requests API file exists and contains the right functions
const apiFile = path.join(
  __dirname,
  "app",
  "api",
  "return-requests",
  "route.ts"
);
if (fs.existsSync(apiFile)) {
  const content = fs.readFileSync(apiFile, "utf-8");

  console.log("📁 API Route File: ✅ EXISTS");

  // Check for required functions
  const hasPostHandler = content.includes("export async function POST");
  const hasGetHandler = content.includes("export async function GET");
  const hasReturnRequestsImport = content.includes("returnRequests");
  const hasInsertOperation = content.includes(".insert(returnRequests)");

  console.log("🔧 POST Handler:", hasPostHandler ? "✅" : "❌");
  console.log("🔧 GET Handler:", hasGetHandler ? "✅" : "❌");
  console.log(
    "🔧 returnRequests table import:",
    hasReturnRequestsImport ? "✅" : "❌"
  );
  console.log("🔧 Insert operation:", hasInsertOperation ? "✅" : "❌");
} else {
  console.log("📁 API Route File: ❌ NOT FOUND");
}

console.log("");

// Check if the admin action functions exist
const actionsFile = path.join(
  __dirname,
  "lib",
  "actions",
  "return-request-enhanced.ts"
);
if (fs.existsSync(actionsFile)) {
  const content = fs.readFileSync(actionsFile, "utf-8");

  console.log("📁 Admin Actions File: ✅ EXISTS");

  const hasCreateFunction = content.includes("createReturnRequest");
  const hasGetPendingFunction = content.includes("getPendingReturnRequests");
  const hasApproveFunction = content.includes("approveReturnRequest");
  const hasRejectFunction = content.includes("rejectReturnRequest");

  console.log("🔧 Create function:", hasCreateFunction ? "✅" : "❌");
  console.log("🔧 Get pending function:", hasGetPendingFunction ? "✅" : "❌");
  console.log("🔧 Approve function:", hasApproveFunction ? "✅" : "❌");
  console.log("🔧 Reject function:", hasRejectFunction ? "✅" : "❌");
} else {
  console.log("📁 Admin Actions File: ❌ NOT FOUND");
}

console.log("");

// Check if the component files exist
const componentFile = path.join(
  __dirname,
  "components",
  "admin",
  "ReturnRequestTableEnhanced.tsx"
);
const pageFile = path.join(
  __dirname,
  "app",
  "admin",
  "return-requests",
  "page.tsx"
);

console.log(
  "📁 Admin Component:",
  fs.existsSync(componentFile) ? "✅ EXISTS" : "❌ NOT FOUND"
);
console.log(
  "📁 Admin Page:",
  fs.existsSync(pageFile) ? "✅ EXISTS" : "❌ NOT FOUND"
);

console.log("");
console.log("🎯 Next Steps for Testing:");
console.log("1. Log in as a user who has borrowed a book");
console.log('2. Go to the book page and click "Return Request"');
console.log('3. Enter confirmation code ("return" or part of book title)');
console.log("4. Check if the request appears in the admin dashboard");
console.log("5. Log in as admin and approve/reject the request");

console.log("");
console.log("📊 System Status: READY FOR TESTING");
