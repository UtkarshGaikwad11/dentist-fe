"use client";

import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const publicRoutes = ["/login"];

    // If logged in and on login page -> go dashboard
    if (pathname === "/login" && token) {
      router.replace("/dashboard");
      setChecking(false);
      return;
    }

    // If not logged in and route is protected -> go login
    if (!publicRoutes.includes(pathname) && !token) {
      router.replace("/login");
      setChecking(false);
      return;
    }

    setChecking(false);
  }, [pathname, router]);

  if (checking) return null;

  return <>{children}</>;
}
