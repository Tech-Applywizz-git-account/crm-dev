"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

export default function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    // Check if ANY of the user's roles match allowedRoles
    const hasAllowedRole = allowedRoles.some(role => user.roles.includes(role as any));
    if (!hasAllowedRole) {
      router.push("/unauthorized");
    }
  }, [user]);


  return <>{children}</>;
}
