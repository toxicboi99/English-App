"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LogoutButton({
  className,
  variant = "ghost",
}: {
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    window.location.href = "/login";
  }

  return (
    <Button className={className} onClick={handleLogout} variant={variant}>
      <LogOut className="mr-2 h-4 w-4" />
      Log out
    </Button>
  );
}
