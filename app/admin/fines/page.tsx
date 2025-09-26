import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminFineManagement from "@/components/admin/AdminFineManagement";

export default async function AdminFinesPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Fine Management</h1>
      <AdminFineManagement />
    </div>
  );
}
