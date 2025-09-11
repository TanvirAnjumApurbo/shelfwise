import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import { getPendingAccountRequests } from "@/lib/actions/account-request";
import { AccountRequestTable } from "@/components/admin/AccountRequestTable";

const AccountRequestsPage = async () => {
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

  // Fetch pending account requests
  const accountRequestsResult = await getPendingAccountRequests();
  const accountRequests = accountRequestsResult.success
    ? accountRequestsResult.data
    : [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Requests</h1>
          <p className="mt-2 text-gray-600">
            Review and manage pending user account registration requests.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Pending Account Requests
              </h2>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {accountRequests?.length || 0} Pending
                </span>
              </div>
            </div>
          </div>

          <AccountRequestTable
            requests={accountRequests || []}
            adminId={session.user.id}
          />
        </div>
      </div>
    </div>
  );
};

export default AccountRequestsPage;
