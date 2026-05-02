"use client"

import { useState } from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { listRefunds } from "@/lib/api"
import type { Refund } from "@/lib/api/schemas"
import { formatCurrency, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 25

type Filters = {
  start: string
  end: string
}

const EMPTY_FILTERS: Filters = { start: "", end: "" }

export function RefundsTable() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)

  const params = {
    start: filters.start || undefined,
    end: filters.end || undefined,
    page,
    page_size: PAGE_SIZE,
  }

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["refunds", "list", params],
    queryFn: () => listRefunds(params),
    placeholderData: keepPreviousData,
  })

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  const hasActiveFilters = filters.start !== "" || filters.end !== ""
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1
  const rangeStart = data && data.total > 0 ? (data.page - 1) * data.page_size + 1 : 0
  const rangeEnd = data ? Math.min(data.page * data.page_size, data.total) : 0

  return (
    <div className="space-y-4">
      <FilterBar
        filters={filters}
        onChange={updateFilter}
        onReset={resetFilters}
        canReset={hasActiveFilters}
      />

      <div className="rounded-lg border bg-card">
        {isError ? (
          <div
            role="alert"
            className="border-b border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          >
            Failed to load refunds
            {error instanceof Error ? `: ${error.message}` : "."}
          </div>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Transaction</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows />
            ) : !data || data.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  No refunds match these filters.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((r) => <RefundRow key={r.id} refund={r} />)
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div
          className={cn(
            "text-xs text-muted-foreground transition-opacity",
            isFetching && !isLoading ? "opacity-60" : "opacity-100",
          )}
          aria-live="polite"
        >
          {data
            ? `Showing ${formatNumber(rangeStart)}–${formatNumber(rangeEnd)} of ${formatNumber(data.total)}`
            : " "}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {data ? data.page : page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!data || page >= totalPages || isLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

function FilterBar({
  filters,
  onChange,
  onReset,
  canReset,
}: {
  filters: Filters
  onChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void
  onReset: () => void
  canReset: boolean
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
      <FilterField label="Start" htmlFor="filter-start">
        <input
          id="filter-start"
          type="date"
          value={filters.start}
          onChange={(e) => onChange("start", e.target.value)}
          className={inputClass}
        />
      </FilterField>

      <FilterField label="End" htmlFor="filter-end">
        <input
          id="filter-end"
          type="date"
          value={filters.end}
          onChange={(e) => onChange("end", e.target.value)}
          className={inputClass}
        />
      </FilterField>

      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        disabled={!canReset}
        className="ml-auto"
      >
        Reset
      </Button>
    </div>
  )
}

const inputClass =
  "h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none disabled:cursor-not-allowed disabled:opacity-50"

function FilterField({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function RefundRow({ refund }: { refund: Refund }) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-sm">
        {formatDateTime(refund.created_at)}
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {shortId(refund.transaction_id)}
      </TableCell>
      <TableCell className="text-right text-sm font-medium tabular-nums">
        {formatCurrency(refund.amount)}
      </TableCell>
      <TableCell className="max-w-[360px] truncate text-sm text-muted-foreground">
        {refund.reason ?? "—"}
      </TableCell>
    </TableRow>
  )
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="ml-auto h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-56" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
