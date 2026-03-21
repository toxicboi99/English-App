import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { canAccessAdminPanel, getCurrentUser } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const canAccessAdmin = await canAccessAdminPanel(user);

  return (
    <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <AppSidebar canAccessAdmin={canAccessAdmin} user={user} />
      <main className="min-w-0 flex-1">
        <MobileNav canAccessAdmin={canAccessAdmin} user={user} />
        {children}
      </main>
    </div>
  );
}
