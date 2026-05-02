import { apiUpload } from "./client"
import { importResultSchema, type ImportResult } from "./schemas"

export function uploadCsv(file: File): Promise<ImportResult> {
  return apiUpload("/imports/csv", importResultSchema, file)
}
