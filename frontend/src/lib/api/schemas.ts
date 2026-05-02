import { z } from "zod"

// Decimals and UUIDs serialize to strings over JSON; dates are ISO strings.
// We keep them as strings here and format/parse at the call site.

export const transactionStatusSchema = z.enum([
  "succeeded",
  "failed",
  "pending",
  "refunded",
])
export const paymentMethodSchema = z.enum(["card", "bank_transfer", "wallet"])
export const intervalSchema = z.enum(["day", "week", "month"])

export type TransactionStatus = z.infer<typeof transactionStatusSchema>
export type PaymentMethod = z.infer<typeof paymentMethodSchema>
export type Interval = z.infer<typeof intervalSchema>

export const customerNestedSchema = z.object({
  id: z.string(),
  email: z.string(),
})

export const customerSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  country: z.string().nullable(),
  created_at: z.string(),
})

export type CustomerNested = z.infer<typeof customerNestedSchema>
export type Customer = z.infer<typeof customerSchema>

export const transactionSchema = z.object({
  id: z.string(),
  customer_id: z.string().nullable(),
  customer: customerNestedSchema.nullable().optional(),
  amount: z.string(),
  currency: z.string(),
  status: transactionStatusSchema,
  payment_method: paymentMethodSchema,
  description: z.string().nullable(),
  created_at: z.string(),
})

export type Transaction = z.infer<typeof transactionSchema>

export const refundSchema = z.object({
  id: z.string(),
  transaction_id: z.string(),
  amount: z.string(),
  reason: z.string().nullable(),
  created_at: z.string(),
})

export type Refund = z.infer<typeof refundSchema>

export const pageSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    page: z.number(),
    page_size: z.number(),
    total: z.number(),
    items: z.array(item),
  })

export type Page<T> = {
  page: number
  page_size: number
  total: number
  items: T[]
}

export const dateRangeSchema = z.object({
  start: z.string(),
  end: z.string(),
})

export const dashboardSummarySchema = z.object({
  range: dateRangeSchema,
  total_revenue: z.string(),
  transaction_count: z.number(),
  successful_count: z.number(),
  failed_count: z.number(),
  refund_total: z.string(),
  refund_rate: z.number(),
  average_order_value: z.string(),
  currency: z.string(),
})

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>

export const trendPointSchema = z.object({
  date: z.string(),
  revenue: z.string(),
  count: z.number(),
})

export const revenueTrendSchema = z.object({
  interval: intervalSchema,
  points: z.array(trendPointSchema),
})

export type TrendPoint = z.infer<typeof trendPointSchema>
export type RevenueTrend = z.infer<typeof revenueTrendSchema>

export const refundTrendPointSchema = z.object({
  date: z.string(),
  refund_amount: z.string(),
  count: z.number(),
})

export const refundTrendSchema = z.object({
  interval: intervalSchema,
  points: z.array(refundTrendPointSchema),
})

export type RefundTrendPoint = z.infer<typeof refundTrendPointSchema>
export type RefundTrend = z.infer<typeof refundTrendSchema>

export const importRowErrorSchema = z.object({
  row: z.number(),
  message: z.string(),
})

export const importResultSchema = z.object({
  imported: z.number(),
  skipped: z.number(),
  failed: z.number(),
  errors: z.array(importRowErrorSchema),
})

export type ImportRowError = z.infer<typeof importRowErrorSchema>
export type ImportResult = z.infer<typeof importResultSchema>

export const weeklyInsightSchema = z.object({
  week_start: z.string(),
  week_end: z.string(),
  narrative: z.string(),
  summary: dashboardSummarySchema,
  previous_summary: dashboardSummarySchema,
  model: z.string(),
  generated_at: z.string(),
  cached: z.boolean(),
})

export type WeeklyInsight = z.infer<typeof weeklyInsightSchema>

// Create payloads (sent from the client)

export const transactionCreateSchema = z.object({
  customer_id: z.string().nullable().optional(),
  amount: z.string(),
  currency: z.string().default("USD"),
  status: transactionStatusSchema,
  payment_method: paymentMethodSchema,
  description: z.string().nullable().optional(),
})

export type TransactionCreate = z.infer<typeof transactionCreateSchema>

export const refundCreateSchema = z.object({
  transaction_id: z.string(),
  amount: z.string(),
  reason: z.string().nullable().optional(),
})

export type RefundCreate = z.infer<typeof refundCreateSchema>
