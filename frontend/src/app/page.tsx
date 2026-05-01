import { SummaryCards } from "@/components/dashboard/summary-cards"

export default function DashboardPage() {
  return (
    <div className="px-8 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview for the last 30 days.
        </p>
      </header>
      <SummaryCards />
    </div>
  )
}
