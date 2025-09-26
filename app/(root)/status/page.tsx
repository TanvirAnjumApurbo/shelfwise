import { auth } from "@/auth";
import { redirect } from "next/navigation";
import UserStatusPage from "@/components/UserStatusPage";

export default async function StatusPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen">
      <UserStatusPage userId={session.user.id!} />
    </div>
  );
}
