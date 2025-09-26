import { ReactNode } from "react";
import Header from "@/components/Header";
import RestrictionBanner from "@/components/RestrictionBanner";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { eq } from "drizzle-orm";

const layout = async ({ children }: { children: ReactNode }) => {
  const session = await auth();
  if (!session) redirect("/sign-in");

  if (session.user.role === "ADMIN") redirect("/admin");

  // Get user restriction status
  const userRestrictionData = await db
    .select({
      isRestricted: users.isRestricted,
      restrictionReason: users.restrictionReason,
    })
    .from(users)
    .where(eq(users.id, session?.user?.id))
    .limit(1);

  const userRestriction = userRestrictionData[0] || {
    isRestricted: false,
    restrictionReason: null,
  };

  after(async () => {
    if (!session?.user?.id) return;

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session?.user?.id))
      .limit(1);

    if (user[0].lastActivityDate === new Date().toISOString().slice(0, 10))
      return;

    await db
      .update(users)
      .set({ lastActivityDate: new Date().toISOString().slice(0, 10) })
      .where(eq(users.id, session?.user?.id));
  });

  return (
    <main className="root-container">
      <RestrictionBanner
        isRestricted={userRestriction.isRestricted}
        restrictionReason={userRestriction.restrictionReason || undefined}
      />
      <div className="mx-auto max-w-7xl">
        <Header />
        <div className="mt-20 pb-20">{children}</div>
      </div>
    </main>
  );
};

export default layout;
