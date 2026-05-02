"use client"

import { useQuery } from "@tanstack/react-query"
import { ArrowDown, ArrowUp, ShieldAlert, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getAnomalies, type Anomaly } from "@/lib/api"
import { formatCurrency } from "@/lib/format"

export function AnomaliesCard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["dashboard", "anomalies"],
    queryFn: () => getAnomalies(),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {data && data.anomalies.length > 0 ? (
            <ShieldAlert className="size-4 text-destructive" aria-hidden />
          ) : (
            <ShieldCheck className="size-4 text-primary" aria-hidden />
          )}
          Revenue anomalies
        </CardTitle>
        <CardDescription>
          {data
            ? `Last ${daysBetween(data.window.start, data.window.end) + 1} days vs a ${data.baseline_days}-day rolling baseline (|z| > ${data.threshold}).`
            : "Days where daily revenue deviates from the rolling baseline."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <RowSkeletons />}
        {isError && (
          <p
            role="alert"
            className="text-sm text-destructive"
          >
            Failed to load anomalies
            {error instanceof Error ? `: ${error.message}` : "."}
          </p>
        )}
        {data && data.anomalies.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No anomalies detected — revenue looks normal.
          </p>
        )}
        {data && data.anomalies.length > 0 && (
          <ul className="divide-y divide-border">
            {data.anomalies.map((a) => (
              <AnomalyRow key={a.date} anomaly={a} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function AnomalyRow({ anomaly }: { anomaly: Anomaly }) {
  const isHigh = anomaly.direction === "high"
  const Icon = isHigh ? ArrowUp : ArrowDown
  const severe = Math.abs(anomaly.z_score) >= 3

  const baselineMean = Number(anomaly.baseline_mean)
  const revenue = Number(anomaly.revenue)
  const pctVsBaseline =
    baselineMean > 0 ? ((revenue - baselineMean) / baselineMean) * 100 : null

  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span
          className={
            isHigh
              ? "rounded-md bg-primary/10 p-1.5 text-primary"
              : "rounded-md bg-destructive/10 p-1.5 text-destructive"
          }
          aria-hidden
        >
          <Icon className="size-4" />
        </span>
        <div className="space-y-0.5">
          <div className="text-sm font-medium">{formatDate(anomaly.date)}</div>
          <div className="text-xs text-muted-foreground">
            {formatCurrency(anomaly.revenue)} vs baseline{" "}
            {formatCurrency(anomaly.baseline_mean)}
            {pctVsBaseline !== null && (
              <>
                {" "}
                <span
                  className={
                    isHigh ? "text-primary" : "text-destructive"
                  }
                >
                  ({pctVsBaseline > 0 ? "+" : ""}
                  {pctVsBaseline.toFixed(0)}%)
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <Badge variant={severe ? "destructive" : "secondary"} className="font-mono">
        z = {anomaly.z_score > 0 ? "+" : ""}
        {anomaly.z_score.toFixed(2)}
      </Badge>
    </li>
  )
}

function RowSkeletons() {
  return (
    <ul className="divide-y divide-border">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
          <div className="flex items-center gap-3">
            <Skeleton className="size-7 rounded-md" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-5 w-16" />
        </li>
      ))}
    </ul>
  )
}

function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso)
  const end = new Date(endIso)
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(iso: string): string {
  // ISO date string from the API; render as short month + day
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
