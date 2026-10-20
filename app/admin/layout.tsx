import React from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { authorizeStaff } from "@/lib/admin-auth";
import { AdminNotificationProvider } from "@/features/admin/components/admin-notification-system";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const isStaff = await authorizeStaff();
  if (!isStaff) {
    redirect("/dashboard");
  }

  return (
    <AdminNotificationProvider>
      {children}
    </AdminNotificationProvider>
  );
}
