import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import { getPendingReturnRequests } from "@/lib/actions/return-request-enhanced";
import { ReturnRequestTableEnhanced } from "@/components/admin/ReturnRequestTableEnhanced";

const ReturnRequestsPage = async () => {
  const session = await auth();

  // Check if user is logged in
  if (!session?.user?.id) redirect("/sign-in");

  // Check if user is admin
  const isAdmin = await db
    .select({ isAdmin: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
    .then((res) => res[0]?.isAdmin === "ADMIN");

  if (!isAdmin) redirect("/");

  // Fetch pending return requests
  const returnRequestsResult = await getPendingReturnRequests();
  const returnRequests = returnRequestsResult.success
    ? returnRequestsResult.data
    : [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Return Requests Management
          </h1>
          <p className="mt-2 text-gray-600">
            Review and process book return requests
          </p>
        </div>

        <div className="space-y-8">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">
                    Pending Return Requests
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {returnRequests?.length || 0}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">
                    Actions Required
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {returnRequests?.length || 0}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <svg
                    className="w-6 h-6 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <p className="text-lg font-medium text-gray-900">
                    {returnRequests?.length === 0
                      ? "All Clear"
                      : "Action Needed"}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-full ${
                    returnRequests?.length === 0
                      ? "bg-green-100"
                      : "bg-yellow-100"
                  }`}
                >
                  {returnRequests?.length === 0 ? (
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-6 h-6 text-yellow-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Return Requests Table */}
          <ReturnRequestTableEnhanced
            requests={returnRequests || []}
            adminId={session.user.id}
          />
        </div>
      </div>
    </div>
  );
};

export default ReturnRequestsPage;
