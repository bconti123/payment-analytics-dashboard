"use client"

import { useMutation } from "@tanstack/react-query"
import { CheckCircle2, FileUp, XCircle } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ApiError, uploadCsv, type ImportResult } from "@/lib/api"

export function CsvUpload() {
  const [file, setFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = useMutation<ImportResult, unknown, File>({
    mutationFn: uploadCsv,
  })

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    upload.reset()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (file) upload.mutate(file)
  }

  const handleClear = () => {
    setFile(null)
    upload.reset()
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileUp className="size-4 text-primary" aria-hidden />
          Upload Stripe-style CSV
        </CardTitle>
        <CardDescription>
          Required columns: <code className="font-mono text-xs">id, created, amount, currency, status, payment_method, customer_email</code>.
          Amount is in cents. Re-uploading the same file is safe — duplicates are skipped via the <code className="font-mono text-xs">id</code> column.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="csv-file">CSV file</label>
          <input
            ref={inputRef}
            id="csv-file"
            name="file"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="block text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/80"
          />
          <Button type="submit" disabled={!file || upload.isPending}>
            {upload.isPending ? "Importing..." : "Upload"}
          </Button>
          {(file || upload.data) && (
            <Button type="button" variant="ghost" onClick={handleClear}>
              Clear
            </Button>
          )}
        </form>

        {upload.isError && <UploadError error={upload.error} />}
        {upload.data && <UploadResult result={upload.data} />}
      </CardContent>
    </Card>
  )
}

function UploadResult({ result }: { result: ImportResult }) {
  return (
    <div className="mt-6 space-y-4">
      <div
        role="status"
        className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm"
      >
        <CheckCircle2 className="size-4 text-primary" aria-hidden />
        <span>
          <strong>{result.imported}</strong> imported ·{" "}
          <strong>{result.skipped}</strong> skipped (already imported) ·{" "}
          <strong>{result.failed}</strong> failed
        </span>
      </div>

      {result.errors.length > 0 && (
        <details
          className="rounded-md border border-destructive/30 bg-destructive/5 p-4"
          open
        >
          <summary className="cursor-pointer text-sm font-medium text-destructive">
            {result.errors.length} row error{result.errors.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-3 space-y-1.5 text-sm">
            {result.errors.map((e) => (
              <li key={e.row} className="font-mono text-xs">
                <span className="text-muted-foreground">row {e.row}:</span>{" "}
                {e.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function UploadError({ error }: { error: unknown }) {
  let message = "Upload failed."
  if (error instanceof ApiError) {
    const detail =
      error.body && typeof error.body === "object" && "detail" in error.body
        ? String((error.body as { detail: unknown }).detail)
        : error.message
    message = `Upload failed (${error.status}): ${detail}`
  } else if (error instanceof Error) {
    message = `Upload failed: ${error.message}`
  }
  return (
    <div
      role="alert"
      className="mt-6 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
    >
      <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  )
}
