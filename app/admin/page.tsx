import React from "react";
import { Button } from "@/components/ui/button";
import { BorrowRequestTable } from "@/components/admin/BorrowRequestTable";
import { ReturnRequestTable } from "@/components/admin/ReturnRequestTable";
import { getPendingBorrowRequests } from "@/lib/actions/borrow-request";
import { getPendingReturnRequests } from "@/lib/actions/return-request-enhanced";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

const AdminDashboard = async () => {
  const session = await auth();

  // Check if user is admin
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  // Fetch pending requests
  const borrowRequestsResult = await getPendingBorrowRequests();
  const returnRequestsResult = await getPendingReturnRequests();

  const borrowRequests = borrowRequestsResult.success
    ? borrowRequestsResult.data
    : [];
  const returnRequests = returnRequestsResult.success
    ? returnRequestsResult.data
    : [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Library Admin Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Manage borrow and return requests
          </p>
        </div>

        <div className="space-y-8">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">
                    Pending Borrow Requests
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {borrowRequests?.length || 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
              </div>
            </div>

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
                    Total Pending Actions
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(borrowRequests?.length || 0) +
                      (returnRequests?.length || 0)}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Borrow Requests Table */}
          <BorrowRequestTable
            requests={borrowRequests || []}
            adminId={session.user.id}
          />

          {/* Return Requests Table */}
          <ReturnRequestTable requests={returnRequests || []} />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
