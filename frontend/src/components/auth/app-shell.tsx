"use client"

import { usePathname } from "next/navigation"

import { MobileNav, Sidebar } from "@/components/app-nav"

const NAVLESS_PATHS = new Set(["/login"])

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (NAVLESS_PATHS.has(pathname)) {
    return (
      <div className="flex min-h-screen flex-col">
        <main id="main" className="flex-1">
          {children}
        </main>
      </div>
    )
  }

  // Reads are public; the sidebar shows a Sign in link when unauthed and
  // user info + Logout when authed. No ProtectedRoute wrapper — pages
  // themselves decide what to show for unauthed visitors.
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-x-auto">
        <MobileNav />
        <main id="main" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
