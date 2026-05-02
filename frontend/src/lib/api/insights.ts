import { apiGet } from "./client"
import { weeklyInsightSchema, type WeeklyInsight } from "./schemas"

export type WeeklyInsightParams = {
  week_ending?: string
  refresh?: boolean
}

export function getWeeklyInsight(
  params: WeeklyInsightParams = {},
): Promise<WeeklyInsight> {
  return apiGet("/insights/weekly", weeklyInsightSchema, params)
}
