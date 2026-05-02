import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen } from "@testing-library/react"

import { AnomaliesCard } from "./anomalies-card"
import { renderWithQueryClient } from "@/test/render"

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api")
  return {
    ...actual,
    getAnomalies: vi.fn(),
  }
})

import { getAnomalies } from "@/lib/api"
const mockGetAnomalies = vi.mocked(getAnomalies)

const baseReport = {
  window: { start: "2026-04-03", end: "2026-05-02" },
  threshold: 2.0,
  baseline_days: 7,
}

describe("AnomaliesCard", () => {
  beforeEach(() => {
    mockGetAnomalies.mockReset()
  })

  it("renders the empty-state copy when no anomalies are flagged", async () => {
    mockGetAnomalies.mockResolvedValue({ ...baseReport, anomalies: [] })
    renderWithQueryClient(<AnomaliesCard />)

    expect(
      await screen.findByText(/no anomalies detected/i),
    ).toBeInTheDocument()
  })

  it("renders flagged days with direction badges and z-scores", async () => {
    mockGetAnomalies.mockResolvedValue({
      ...baseReport,
      anomalies: [
        {
          date: "2026-04-21",
          revenue: "3015.81",
          baseline_mean: "1496.37",
          baseline_stddev: "370.92",
          z_score: 4.1,
          direction: "high",
        },
        {
          date: "2026-04-19",
          revenue: "886.28",
          baseline_mean: "1765.23",
          baseline_stddev: "384.06",
          z_score: -2.29,
          direction: "low",
        },
      ],
    })

    renderWithQueryClient(<AnomaliesCard />)

    expect(await screen.findByText(/z = \+4\.10/)).toBeInTheDocument()
    expect(screen.getByText(/z = -2\.29/)).toBeInTheDocument()
    // % deviation rendered for both rows
    expect(screen.getByText(/\+102%/)).toBeInTheDocument()
    expect(screen.getByText(/-50%/)).toBeInTheDocument()
  })
})
