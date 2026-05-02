"use client"

import { Moon, Sun } from "lucide-react"
import dynamic from "next/dynamic"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

function ThemeToggleImpl() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="size-9 p-0"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}

export const ThemeToggle = dynamic(() => Promise.resolve(ThemeToggleImpl), {
  ssr: false,
  loading: () => <div className="size-9" aria-hidden />,
})
