import { RefundTrendChart } from "@/components/dashboard/refund-trend-chart"
import { RevenueTrendChart } from "@/components/dashboard/revenue-trend-chart"
import { SummaryCards } from "@/components/dashboard/summary-cards"

export default function DashboardPage() {
  return (
    <div className="space-y-8 px-8 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview for the last 30 days.
        </p>
      </header>
      <SummaryCards />
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueTrendChart />
        <RefundTrendChart />
      </div>
    </div>
  )
}
