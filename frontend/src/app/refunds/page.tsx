import { RefundsTable } from "@/components/refunds/refunds-table"

export default function RefundsPage() {
  return (
    <div className="space-y-6 px-8 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Refunds</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All refund activity across transactions.
        </p>
      </header>
      <RefundsTable />
    </div>
  )
}
