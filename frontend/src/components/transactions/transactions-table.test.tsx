import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { TransactionsTable } from "./transactions-table"
import { resetMockUrl } from "@/test/next-navigation-mock"
import { renderWithQueryClient } from "@/test/render"

vi.mock("next/navigation", async () => {
  const { createNavigationMock } = await import("@/test/next-navigation-mock")
  return createNavigationMock("/transactions")
})

vi.mock("@/lib/api", () => ({
  listTransactions: vi.fn(),
}))

import { listTransactions } from "@/lib/api"
const mockListTransactions = vi.mocked(listTransactions)

function emptyPage(page = 1) {
  return { page, page_size: 25, total: 0, items: [] }
}

describe("TransactionsTable", () => {
  beforeEach(() => {
    resetMockUrl()
    mockListTransactions.mockReset()
    mockListTransactions.mockResolvedValue(emptyPage())
  })

  it("blocks the fetch and shows an inline error when end date precedes start date", async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<TransactionsTable />)

    await waitFor(() => {
      expect(mockListTransactions).toHaveBeenCalledTimes(1)
    })

    await user.type(screen.getByLabelText("Start"), "2026-05-10")
    await waitFor(() => {
      expect(mockListTransactions).toHaveBeenCalledTimes(2)
    })

    const callCountBeforeInvalid = mockListTransactions.mock.calls.length
    await user.type(screen.getByLabelText("End"), "2026-05-01")

    expect(
      await screen.findByText(/end date must be on or after start date/i),
    ).toBeInTheDocument()
    expect(mockListTransactions).toHaveBeenCalledTimes(callCountBeforeInvalid)
  })

  it("changing a filter resets pagination to page 1 and refetches", async () => {
    const user = userEvent.setup()
    mockListTransactions.mockResolvedValue({
      page: 1,
      page_size: 25,
      total: 100,
      items: [],
    })
    renderWithQueryClient(<TransactionsTable />)

    await waitFor(() => {
      expect(mockListTransactions).toHaveBeenCalledTimes(1)
    })

    await user.click(screen.getByRole("button", { name: /next/i }))
    await waitFor(() => {
      const lastCall = mockListTransactions.mock.lastCall?.[0]
      expect(lastCall).toMatchObject({ page: 2 })
    })

    await user.selectOptions(screen.getByLabelText("Status"), "failed")

    await waitFor(() => {
      const lastCall = mockListTransactions.mock.lastCall?.[0]
      expect(lastCall).toMatchObject({ page: 1, status: "failed" })
    })
  })
})
