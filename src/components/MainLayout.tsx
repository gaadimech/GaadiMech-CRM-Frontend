"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar />
      {/* Main content with padding-left on large screens for sidebar space */}
      <main className="min-h-screen pt-16 sm:pt-4">{children}</main>
    </div>
  );
}

