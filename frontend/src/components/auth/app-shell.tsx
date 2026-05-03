"use client"

import { usePathname } from "next/navigation"

import { MobileNav, Sidebar } from "@/components/app-nav"
import { ProtectedRoute } from "@/components/auth/protected"

const PUBLIC_PATHS = new Set(["/login"])

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = PUBLIC_PATHS.has(pathname)

  if (isPublic) {
    return (
      <div className="flex min-h-screen flex-col">
        <main id="main" className="flex-1">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-x-auto">
        <MobileNav />
        <main id="main" className="flex-1">
          <ProtectedRoute>{children}</ProtectedRoute>
        </main>
      </div>
    </div>
  )
}
