"use client"

import { FileUp, LayoutDashboard, LogIn, LogOut, Receipt, Undo2 } from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"

import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/lib/auth/context"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/refunds", label: "Refunds", icon: Undo2 },
  { href: "/import", label: "Import", icon: FileUp },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.replace("/login")
  }

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-5">
        <div>
          <h1 className="text-base font-semibold tracking-tight">
            Payment Analytics
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Dashboard</p>
        </div>
        <ThemeToggle />
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-sidebar-border px-3 py-3">
        {user ? (
          <>
            <div className="px-2 pb-2">
              <div className="truncate text-xs font-medium" title={user.email}>
                {user.email}
              </div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {user.role}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <LogIn className="size-4" />
            Sign in
          </Link>
        )}
      </div>
    </aside>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.replace("/login")
  }

  return (
    <header className="sticky top-0 z-30 flex flex-col gap-2 border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:hidden">
      <div className="flex items-center justify-between px-4 pt-3">
        <h1 className="text-sm font-semibold tracking-tight">
          Payment Analytics
        </h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Log out"
              className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            >
              <LogOut className="size-4" />
            </button>
          ) : (
            <Link
              href="/login"
              aria-label="Sign in"
              className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            >
              <LogIn className="size-4" />
            </Link>
          )}
        </div>
      </div>
      <nav
        aria-label="Primary"
        className="-mb-px flex gap-1 overflow-x-auto px-3 pb-1"
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
                isActive
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-sidebar-foreground/80 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
