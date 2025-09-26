import { auth } from "@/auth";
import { redirect } from "next/navigation";
import PaymentPage from "@/components/stripe/PaymentPage";
import { SessionProvider } from "next-auth/react";

export default async function FinesPaymentPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <SessionProvider session={session}>
      <PaymentPage />
    </SessionProvider>
  );
}
