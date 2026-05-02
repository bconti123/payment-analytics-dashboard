import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { CsvUpload } from "./csv-upload"
import { renderWithQueryClient } from "@/test/render"

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api")
  return {
    ...actual,
    uploadCsv: vi.fn(),
  }
})

import { uploadCsv } from "@/lib/api"
const mockUploadCsv = vi.mocked(uploadCsv)

function makeFile(content = "id,created\npi_1,2026-04-15T10:00:00Z\n") {
  return new File([content], "stripe.csv", { type: "text/csv" })
}

describe("CsvUpload", () => {
  beforeEach(() => {
    mockUploadCsv.mockReset()
  })

  it("uploads the chosen file and renders the result summary", async () => {
    const user = userEvent.setup()
    mockUploadCsv.mockResolvedValue({
      imported: 2,
      skipped: 1,
      failed: 0,
      errors: [],
    })

    renderWithQueryClient(<CsvUpload />)

    const fileInput = screen.getByLabelText(/csv file/i) as HTMLInputElement
    await user.upload(fileInput, makeFile())
    await user.click(screen.getByRole("button", { name: /upload/i }))

    await waitFor(() => {
      expect(mockUploadCsv).toHaveBeenCalledTimes(1)
    })
    expect(mockUploadCsv.mock.lastCall?.[0]).toBeInstanceOf(File)

    const status = await screen.findByRole("status")
    expect(status).toHaveTextContent("2")
    expect(status).toHaveTextContent("1")
    expect(status).toHaveTextContent("0")
  })

  it("shows per-row errors when the API returns failures", async () => {
    const user = userEvent.setup()
    mockUploadCsv.mockResolvedValue({
      imported: 1,
      skipped: 0,
      failed: 2,
      errors: [
        { row: 3, message: "status must be one of [...]" },
        { row: 4, message: "amount must be an integer (cents)" },
      ],
    })

    renderWithQueryClient(<CsvUpload />)
    await userEvent.setup().upload(screen.getByLabelText(/csv file/i), makeFile())
    await user.click(screen.getByRole("button", { name: /upload/i }))

    expect(await screen.findByText(/2 row errors/i)).toBeInTheDocument()
    expect(screen.getByText(/row 3:/i)).toBeInTheDocument()
    expect(screen.getByText(/row 4:/i)).toBeInTheDocument()
  })
})
