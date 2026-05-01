import { apiGet, apiPost } from "./client"
import {
  pageSchema,
  refundSchema,
  type Page,
  type Refund,
  type RefundCreate,
} from "./schemas"

export type ListRefundsParams = {
  start?: string
  end?: string
  page?: number
  page_size?: number
}

export function listRefunds(
  params: ListRefundsParams = {},
): Promise<Page<Refund>> {
  return apiGet("/refunds", pageSchema(refundSchema), params)
}

export function createRefund(payload: RefundCreate): Promise<Refund> {
  return apiPost("/refunds", refundSchema, payload)
}
