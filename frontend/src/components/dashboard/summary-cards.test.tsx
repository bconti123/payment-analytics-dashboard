import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"

import { SummaryCards } from "./summary-cards"
import { renderWithQueryClient } from "@/test/render"

vi.mock("@/lib/api", () => ({
  getDashboardSummary: vi.fn(),
}))

import { getDashboardSummary } from "@/lib/api"
const mockGetDashboardSummary = vi.mocked(getDashboardSummary)

describe("SummaryCards", () => {
  beforeEach(() => {
    mockGetDashboardSummary.mockReset()
  })

  it("renders KPI values from the API response", async () => {
    mockGetDashboardSummary.mockResolvedValue({
      range: { start: "2026-04-01", end: "2026-05-01" },
      total_revenue: "12500.50",
      transaction_count: 200,
      successful_count: 180,
      failed_count: 20,
      refund_total: "750.00",
      refund_rate: 0.06,
      average_order_value: "62.50",
      currency: "USD",
    })

    renderWithQueryClient(<SummaryCards />)

    await waitFor(() => {
      expect(screen.getByText("$12,500.50")).toBeInTheDocument()
    })
    expect(screen.getByText("200")).toBeInTheDocument()
    expect(screen.getByText("6.0%")).toBeInTheDocument()
    expect(screen.getByText("$62.50")).toBeInTheDocument()
    expect(screen.getByText(/180 succeeded/)).toBeInTheDocument()
    expect(screen.getByText(/\$750\.00 refunded/)).toBeInTheDocument()
  })

  it("renders an error banner when the request fails", async () => {
    mockGetDashboardSummary.mockRejectedValue(new Error("network down"))

    renderWithQueryClient(<SummaryCards />)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Failed to load summary")
    expect(alert).toHaveTextContent("network down")
  })
})
