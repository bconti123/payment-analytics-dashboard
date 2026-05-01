import { apiGet } from "./client"
import {
  dashboardSummarySchema,
  refundTrendSchema,
  revenueTrendSchema,
  type DashboardSummary,
  type Interval,
  type RefundTrend,
  type RevenueTrend,
} from "./schemas"

export type DashboardSummaryParams = {
  start?: string
  end?: string
}

export function getDashboardSummary(
  params: DashboardSummaryParams = {},
): Promise<DashboardSummary> {
  return apiGet("/dashboard/summary", dashboardSummarySchema, params)
}

export type TrendParams = {
  start?: string
  end?: string
  interval?: Interval
}

export function getRevenueTrend(
  params: TrendParams = {},
): Promise<RevenueTrend> {
  return apiGet("/dashboard/revenue-trend", revenueTrendSchema, params)
}

export function getRefundTrend(
  params: TrendParams = {},
): Promise<RefundTrend> {
  return apiGet("/dashboard/refund-trend", refundTrendSchema, params)
}
