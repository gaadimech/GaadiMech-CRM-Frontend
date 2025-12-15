"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getApiBase } from "../lib/apiBase";

const API_BASE = getApiBase();

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/add-lead", label: "Add Lead", icon: "M12 4v16m8-8H4" },
  { href: "/todays-leads", label: "Today's Leads", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/followups", label: "View Followups", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
  { href: "/whatsapp-templates", label: "WhatsApp", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
];

const adminNavItems = [
  { href: "/admin/leads", label: "Admin Leads", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { href: "/admin/leads-manipulation", label: "Leads Manipulation", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
  { href: "/admin/download-leads", label: "Download Leads", icon: "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { href: "/admin/whatsapp-bulk", label: "WhatsApp Messaging", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { href: "/password-manager", label: "Passwords", icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    
    async function checkUser() {
      try {
        const res = await fetch(`${API_BASE}/api/user/current`, {
          credentials: "include",
          cache: "no-store", // Prevent caching
        });
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;
          
          console.log("[Sidebar] User data from API:", data);
          console.log("[Sidebar] is_admin value:", data.is_admin, "Type:", typeof data.is_admin);
          // More robust admin check - handle boolean true, string "true", number 1, etc.
          const adminValue = data.is_admin;
          const isAdminValue = adminValue === true || 
                              adminValue === "true" || 
                              adminValue === 1 || 
                              adminValue === "1" ||
                              String(adminValue).toLowerCase() === "true";
          setIsAdmin(isAdminValue);
          setUserName(data.name || data.username || "User");
          console.log("[Sidebar] isAdmin state set to:", isAdminValue);
          retryCount = 0; // Reset retry count on success
        } else {
          if (retryCount < maxRetries) {
            retryCount++;
            console.warn(`[Sidebar] Failed to get user data (attempt ${retryCount}/${maxRetries}):`, res.status);
          } else {
            console.error("[Sidebar] Failed to get user data after retries:", res.status);
          }
          if (isMounted) {
            setIsAdmin(false);
          }
        }
      } catch (err) {
        if (retryCount < maxRetries) {
          retryCount++;
          // Only log after max retries to reduce console noise
          if (retryCount === maxRetries) {
            console.error("[Sidebar] Error checking user after retries:", err);
          }
        }
        if (isMounted) {
          setIsAdmin(false);
        }
      }
    }
    
    // Initial check with a small delay to avoid race conditions
    const timeoutId = setTimeout(checkUser, 100);
    
    // Note: Removed periodic polling - user status is checked by ProtectedRoute
    // and doesn't need to be polled every 5 seconds
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  async function handleLogout() {
    try {
      await fetch(`${API_BASE}/logout`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept": "application/json",
        },
      });
      
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
      router.push("/login");
    }
  }

  // Don't show sidebar on login page
  if (pathname === "/login") {
    return null;
  }

  return (
    <>
      {/* Fixed Top Header Bar for Mobile */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-zinc-200 h-14 flex items-center px-4 sm:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:bg-zinc-100 active:bg-zinc-200 transition touch-manipulation"
          aria-label="Open menu"
        >
          <svg
            className="w-6 h-6 text-zinc-900"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="ml-3 text-lg font-semibold text-zinc-900">GaadiMech CRM</h1>
      </header>

      {/* Desktop Menu Button (hidden on mobile) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`hidden sm:flex fixed z-50 p-2.5 bg-white border border-zinc-200 rounded-lg shadow-sm hover:bg-zinc-50 transition items-center justify-center ${
          isOpen ? "left-[260px] top-4" : "left-4 top-4"
        }`}
        aria-label="Toggle sidebar"
      >
        <svg
          className="w-5 h-5 text-zinc-900"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isOpen ? (
            <path d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-white border-r border-zinc-200 flex flex-col z-50 transition-transform duration-300 ease-in-out w-[280px] sm:w-64 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo/Header */}
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-900">GaadiMech CRM</h1>
            {userName && (
              <p className="text-sm text-zinc-600 mt-0.5">{userName}</p>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-zinc-100 active:bg-zinc-200 transition touch-manipulation sm:hidden"
            aria-label="Close menu"
          >
            <svg
              className="w-5 h-5 text-zinc-600"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition touch-manipulation ${
                pathname === item.href
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200"
              }`}
            >
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d={item.icon} />
              </svg>
              <span>{item.label}</span>
            </Link>
          ))}
          
          {isAdmin && (
            <>
              <div className="pt-3 pb-2 px-4">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Admin</p>
              </div>
              {adminNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition touch-manipulation ${
                    pathname === item.href
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200"
                  }`}
                >
                  <svg
                    className="w-5 h-5 flex-shrink-0"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d={item.icon} />
                  </svg>
                  <span>{item.label}</span>
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-zinc-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 active:bg-red-100 transition touch-manipulation"
          >
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

