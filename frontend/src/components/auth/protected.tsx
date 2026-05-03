"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

import { useAuth } from "@/lib/auth/context"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === "unauthenticated") {
      const next = encodeURIComponent(pathname || "/")
      router.replace(`/login?next=${next}`)
    }
  }, [status, pathname, router])

  if (status === "authenticated") return <>{children}</>
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
      Loading...
    </div>
  )
}
