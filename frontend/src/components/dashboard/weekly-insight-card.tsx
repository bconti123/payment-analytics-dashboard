"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { LogIn, RefreshCw, Sparkles } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError, getWeeklyInsight } from "@/lib/api"
import { useAuth } from "@/lib/auth/context"

const QUERY_KEY = ["insights", "weekly"] as const

export function WeeklyInsightCard() {
  const queryClient = useQueryClient()
  const { status: authStatus } = useAuth()
  const isAuthed = authStatus === "authenticated"

  const { data, isLoading, isError, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => getWeeklyInsight(),
    enabled: isAuthed,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const regenerate = useMutation({
    mutationFn: () => getWeeklyInsight({ refresh: true }),
    onSuccess: (fresh) => {
      queryClient.setQueryData(QUERY_KEY, fresh)
    },
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" aria-hidden />
            Weekly insight
          </CardTitle>
          <CardDescription>
            {data ? (
              <>
                {data.week_start} → {data.week_end}
                {data.cached && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    · cached
                  </span>
                )}
              </>
            ) : (
              "AI-generated narrative comparing this week to last week"
            )}
          </CardDescription>
        </div>
        {data && (
          <Button
            variant="ghost"
            onClick={() => regenerate.mutate()}
            disabled={regenerate.isPending}
            aria-label="Regenerate insight"
            className="h-8 px-3 text-xs"
          >
            <RefreshCw
              className={`size-3.5 ${regenerate.isPending ? "animate-spin" : ""}`}
              aria-hidden
            />
            Regenerate
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!isAuthed && <SignInPrompt />}
        {isAuthed && isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}
        {isAuthed && isError && <ErrorState error={error} />}
        {isAuthed && data && (
          <p className="text-sm leading-relaxed text-foreground">
            {data.narrative}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function SignInPrompt() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        AI-generated narrative comparing this week to last week. Sign in to
        generate one — gated to keep API costs predictable.
      </p>
      <Link
        href="/login"
        className="inline-flex h-7 items-center gap-1.5 rounded-md bg-secondary px-3 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
      >
        <LogIn className="size-3.5" aria-hidden />
        Sign in
      </Link>
    </div>
  )
}

function ErrorState({ error }: { error: unknown }) {
  if (error instanceof ApiError && error.status === 503) {
    return (
      <p
        role="alert"
        className="text-sm text-muted-foreground"
      >
        AI insight is disabled. Set <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">ANTHROPIC_API_KEY</code> in the backend environment to enable.
      </p>
    )
  }
  return (
    <p
      role="alert"
      className="text-sm text-destructive"
    >
      Failed to load insight
      {error instanceof Error ? `: ${error.message}` : "."}
    </p>
  )
}
