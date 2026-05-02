"use client"

import { LayoutDashboard, Receipt, Undo2 } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/refunds", label: "Refunds", icon: Undo2 },
] as const

export function Sidebar() {
  const pathname = usePathname()

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
      <nav className="space-y-1 p-3">
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
    </aside>
  )
}

export function MobileNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 flex flex-col gap-2 border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:hidden">
      <div className="flex items-center justify-between px-4 pt-3">
        <h1 className="text-sm font-semibold tracking-tight">
          Payment Analytics
        </h1>
        <ThemeToggle />
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
