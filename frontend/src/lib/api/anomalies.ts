import { apiGet } from "./client"
import { anomalyReportSchema, type AnomalyReport } from "./schemas"

export type AnomaliesParams = {
  days?: number
  threshold?: number
  baseline?: number
}

export function getAnomalies(
  params: AnomaliesParams = {},
): Promise<AnomalyReport> {
  return apiGet("/dashboard/anomalies", anomalyReportSchema, params)
}
