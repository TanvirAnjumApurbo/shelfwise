import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import { getAllUsers, getUserStatistics } from "@/lib/admin/actions/user";
import { UsersPageClient } from "@/components/admin/UsersPageClient";

const UsersPage = async () => {
  const session = await auth();

  // Check if user is logged in
  if (!session?.user?.id) redirect("/sign-in");

  // Check if user is admin
  const isAdmin = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
    .then((res) => res[0]?.role === "ADMIN");

  if (!isAdmin) redirect("/");

  // Fetch initial data
  const [usersResult, statsResult] = await Promise.all([
    getAllUsers({ page: 1, limit: 20 }),
    getUserStatistics(),
  ]);

  const initialUsersData = usersResult.success
    ? usersResult.data
    : {
        users: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

  const initialStats = statsResult.success
    ? statsResult.data
    : {
        totalUsers: 0,
        pendingUsers: 0,
        approvedUsers: 0,
        rejectedUsers: 0,
        restrictedUsers: 0,
        adminUsers: 0,
        regularUsers: 0,
        usersWithFines: 0,
      };

  return (
    <section className="w-full rounded-2xl bg-white p-7">
      <UsersPageClient
        adminId={session.user.id}
        initialUsersData={initialUsersData}
        initialStats={initialStats}
      />
    </section>
  );
};

export default UsersPage;
