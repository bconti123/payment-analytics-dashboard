import { CsvUpload } from "@/components/imports/csv-upload"

export default function ImportPage() {
  return (
    <div className="space-y-8 px-8 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Import</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bulk-load transactions from a Stripe-style CSV export.
        </p>
      </header>
      <CsvUpload />
    </div>
  )
}
