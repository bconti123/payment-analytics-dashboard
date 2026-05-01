import { apiGet, apiPost } from "./client"
import {
  pageSchema,
  transactionSchema,
  type Page,
  type PaymentMethod,
  type Transaction,
  type TransactionCreate,
  type TransactionStatus,
} from "./schemas"

export type ListTransactionsParams = {
  status?: TransactionStatus
  method?: PaymentMethod
  start?: string
  end?: string
  page?: number
  page_size?: number
}

export function listTransactions(
  params: ListTransactionsParams = {},
): Promise<Page<Transaction>> {
  return apiGet("/transactions", pageSchema(transactionSchema), params)
}

export function getTransaction(id: string): Promise<Transaction> {
  return apiGet(`/transactions/${id}`, transactionSchema)
}

export function createTransaction(
  payload: TransactionCreate,
): Promise<Transaction> {
  return apiPost("/transactions", transactionSchema, payload)
}
