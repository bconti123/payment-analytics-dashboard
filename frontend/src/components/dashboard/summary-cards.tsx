"use client"

import { useQuery } from "@tanstack/react-query"
import { CreditCard, DollarSign, TrendingDown, TrendingUp } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getDashboardSummary } from "@/lib/api"
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format"

export function SummaryCards() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => getDashboardSummary(),
  })

  if (isLoading) return <CardsSkeleton />

  if (isError) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
      >
        Failed to load summary
        {error instanceof Error ? `: ${error.message}` : "."}
      </div>
    )
  }

  if (!data) return null

  const items = [
    {
      label: "Total Revenue",
      value: formatCurrency(data.total_revenue, data.currency),
      icon: DollarSign,
    },
    {
      label: "Transactions",
      value: formatNumber(data.transaction_count),
      icon: CreditCard,
      hint: `${formatNumber(data.successful_count)} succeeded · ${formatNumber(data.failed_count)} failed`,
    },
    {
      label: "Refund Rate",
      value: formatPercent(data.refund_rate),
      icon: TrendingDown,
      hint: `${formatCurrency(data.refund_total, data.currency)} refunded`,
    },
    {
      label: "Average Order Value",
      value: formatCurrency(data.average_order_value, data.currency),
      icon: TrendingUp,
    },
  ] as const

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ label, value, icon: Icon, ...rest }) => {
        const hint = "hint" in rest ? rest.hint : undefined
        return (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="size-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {value}
              </div>
              {hint && (
                <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function CardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-4 rounded-sm" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-40" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
