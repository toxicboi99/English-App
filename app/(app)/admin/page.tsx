import { redirect } from "next/navigation";

import { AdminPanel } from "@/components/admin/admin-panel";
import { getCurrentUser, requireAdminUser } from "@/lib/auth";
import { getAdminDashboardData } from "@/lib/data";

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const adminUser = await requireAdminUser().catch(() => redirect("/dashboard"));

  const data = await getAdminDashboardData();

  return (
    <AdminPanel
      currentUserId={adminUser.id}
      initialData={JSON.parse(JSON.stringify(data))}
    />
  );
}
