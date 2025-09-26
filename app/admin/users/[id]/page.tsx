import React from "react";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";
import { getUserDetails } from "@/lib/admin/actions/user";
import { UserDetailClient } from "@/components/admin/UserDetailClient";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface UserDetailPageProps {
  params: {
    id: string;
  };
}

const UserDetailPage = async ({ params }: UserDetailPageProps) => {
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

  // Fetch user details
  const userDetailsResult = await getUserDetails(params.id);

  if (!userDetailsResult.success) {
    notFound();
  }

  const userDetails = userDetailsResult.data;

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/users" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Users
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
          <p className="text-gray-600">
            Comprehensive view of user information and activity
          </p>
        </div>
      </div>

      {/* User Detail Component */}
      <UserDetailClient user={userDetails} adminId={session.user.id} />
    </div>
  );
};

export default UserDetailPage;
