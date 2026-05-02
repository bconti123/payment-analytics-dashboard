"use client"

import { useState } from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
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
import { listTransactions } from "@/lib/api"
import type {
  PaymentMethod,
  Transaction,
  TransactionStatus,
} from "@/lib/api/schemas"
import { formatCurrency, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"

const STATUSES: TransactionStatus[] = [
  "succeeded",
  "failed",
  "pending",
  "refunded",
]
const METHODS: PaymentMethod[] = ["card", "bank_transfer", "wallet"]
const PAGE_SIZE = 25

type Filters = {
  status: TransactionStatus | ""
  method: PaymentMethod | ""
  start: string
  end: string
}

const EMPTY_FILTERS: Filters = { status: "", method: "", start: "", end: "" }

export function TransactionsTable() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)

  const dateRangeError =
    filters.start !== "" && filters.end !== "" && filters.start > filters.end

  const params = {
    status: filters.status || undefined,
    method: filters.method || undefined,
    start: filters.start || undefined,
    end: filters.end || undefined,
    page,
    page_size: PAGE_SIZE,
  }

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["transactions", "list", params],
    queryFn: () => listTransactions(params),
    placeholderData: keepPreviousData,
    enabled: !dateRangeError,
  })

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  const hasActiveFilters =
    filters.status !== "" ||
    filters.method !== "" ||
    filters.start !== "" ||
    filters.end !== ""

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
        dateRangeError={dateRangeError}
      />

      <div className="rounded-lg border bg-card">
        {isError ? (
          <div
            role="alert"
            className="border-b border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          >
            Failed to load transactions
            {error instanceof Error ? `: ${error.message}` : "."}
          </div>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows />
            ) : !data || data.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  No transactions match these filters.
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
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
            : " "}
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
  dateRangeError,
}: {
  filters: Filters
  onChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void
  onReset: () => void
  canReset: boolean
  dateRangeError: boolean
}) {
  return (
    <div className="space-y-2">
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
      <FilterField label="Status" htmlFor="filter-status">
        <select
          id="filter-status"
          value={filters.status}
          onChange={(e) =>
            onChange("status", e.target.value as TransactionStatus | "")
          }
          className={selectClass}
        >
          <option value="">All</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {labelize(s)}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Method" htmlFor="filter-method">
        <select
          id="filter-method"
          value={filters.method}
          onChange={(e) =>
            onChange("method", e.target.value as PaymentMethod | "")
          }
          className={selectClass}
        >
          <option value="">All</option>
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {labelize(m)}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Start" htmlFor="filter-start">
        <input
          id="filter-start"
          type="date"
          value={filters.start}
          onChange={(e) => onChange("start", e.target.value)}
          className={selectClass}
        />
      </FilterField>

      <FilterField label="End" htmlFor="filter-end">
        <input
          id="filter-end"
          type="date"
          value={filters.end}
          onChange={(e) => onChange("end", e.target.value)}
          className={selectClass}
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
      {dateRangeError && (
        <p
          role="alert"
          className="px-1 text-xs text-destructive"
        >
          End date must be on or after start date.
        </p>
      )}
    </div>
  )
}

const selectClass =
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

function TransactionRow({ tx }: { tx: Transaction }) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-sm">
        {formatDateTime(tx.created_at)}
      </TableCell>
      <TableCell className="text-sm">
        {tx.customer ? (
          <span className="font-medium">{tx.customer.email}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right text-sm font-medium tabular-nums">
        {formatCurrency(tx.amount, tx.currency)}
      </TableCell>
      <TableCell>
        <StatusBadge status={tx.status} />
      </TableCell>
      <TableCell className="text-sm">{labelize(tx.payment_method)}</TableCell>
      <TableCell className="max-w-[280px] truncate text-sm text-muted-foreground">
        {tx.description ?? "—"}
      </TableCell>
    </TableRow>
  )
}

function StatusBadge({ status }: { status: TransactionStatus }) {
  const variant: React.ComponentProps<typeof Badge>["variant"] =
    status === "succeeded"
      ? "default"
      : status === "failed"
        ? "destructive"
        : status === "pending"
          ? "secondary"
          : "outline"
  return <Badge variant={variant}>{labelize(status)}</Badge>
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
            <Skeleton className="h-4 w-40" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="ml-auto h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-48" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function labelize(value: string): string {
  return value
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ")
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
