"use client";

import { useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LogoutButton({
  className,
  variant = "ghost",
}: {
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const { signOut } = useClerk();

  async function handleLogout() {
    await signOut({ redirectUrl: "/login" });
  }

  return (
    <Button className={className} onClick={handleLogout} variant={variant}>
      <LogOut className="mr-2 h-4 w-4" />
      Log out
    </Button>
  );
}
