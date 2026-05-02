"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getRevenueTrend } from "@/lib/api"
import type { Interval, TrendPoint } from "@/lib/api/schemas"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format"

const INTERVALS: { value: Interval; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
]

type ChartPoint = {
  date: string
  label: string
  revenue: number
  count: number
}

function toChartPoints(points: TrendPoint[], interval: Interval): ChartPoint[] {
  return points.map((p) => ({
    date: p.date,
    label: formatBucketLabel(p.date, interval),
    revenue: Number(p.revenue),
    count: p.count,
  }))
}

function formatBucketLabel(date: string, interval: Interval): string {
  const d = new Date(date)
  if (interval === "month") {
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function RevenueTrendChart() {
  const [interval, setInterval] = useState<Interval>("day")
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["dashboard", "revenueTrend", interval],
    queryFn: () => getRevenueTrend({ interval }),
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-medium">Revenue trend</CardTitle>
        <div
          role="tablist"
          aria-label="Interval"
          className="inline-flex rounded-md border bg-muted/40 p-0.5"
        >
          {INTERVALS.map((opt) => {
            const active = opt.value === interval
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setInterval(opt.value)}
                className={cn(
                  "rounded-sm px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-70 w-full" />
        ) : isError ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          >
            Failed to load revenue trend
            {error instanceof Error ? `: ${error.message}` : "."}
          </div>
        ) : !data || data.points.length === 0 ? (
          <div className="flex h-70 items-center justify-center text-sm text-muted-foreground">
            No revenue data for this range.
          </div>
        ) : (
          <ChartBody points={toChartPoints(data.points, interval)} />
        )}
      </CardContent>
    </Card>
  )
}

function ChartBody({ points }: { points: ChartPoint[] }) {
  return (
    <div className="h-70 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-primary)"
                stopOpacity={0.3}
              />
              <stop
                offset="100%"
                stopColor="var(--color-primary)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            stroke="var(--color-muted-foreground)"
            fontSize={12}
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            stroke="var(--color-muted-foreground)"
            fontSize={12}
            tickFormatter={(v: number) => compactCurrency(v)}
            width={60}
          />
          <Tooltip
            cursor={{
              stroke: "var(--color-muted-foreground)",
              strokeDasharray: "3 3",
            }}
            content={<RevenueTooltip />}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill="url(#revenueFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function RevenueTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: ChartPoint }>
}) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-foreground">{point.label}</div>
      <div className="mt-1 text-foreground">
        {formatCurrency(point.revenue)}
      </div>
      <div className="text-muted-foreground">
        {point.count} transaction{point.count === 1 ? "" : "s"}
      </div>
    </div>
  )
}

function compactCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}
