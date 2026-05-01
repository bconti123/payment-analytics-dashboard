/**
 * Smoke-tests the Zod schemas against a live FastAPI backend.
 * Run from frontend/: npx tsx scripts/smoke-api.ts
 * Requires the backend reachable at NEXT_PUBLIC_API_BASE_URL (or localhost:8000).
 */
import {
  getDashboardSummary,
  getRefundTrend,
  getRevenueTrend,
  getTransaction,
  listRefunds,
  listTransactions,
} from "../src/lib/api"

async function main() {
  console.log("→ /dashboard/summary")
  const summary = await getDashboardSummary()
  console.log("  ✓", {
    revenue: summary.total_revenue,
    txns: summary.transaction_count,
    refund_rate: summary.refund_rate,
  })

  console.log("→ /dashboard/revenue-trend?interval=day")
  const rev = await getRevenueTrend({ interval: "day" })
  console.log("  ✓", { interval: rev.interval, points: rev.points.length })

  console.log("→ /dashboard/refund-trend?interval=week")
  const refTrend = await getRefundTrend({ interval: "week" })
  console.log("  ✓", { interval: refTrend.interval, points: refTrend.points.length })

  console.log("→ /transactions?page_size=3")
  const txns = await listTransactions({ page_size: 3 })
  console.log("  ✓", { total: txns.total, page: txns.page, items: txns.items.length })

  if (txns.items.length > 0) {
    const id = txns.items[0].id
    console.log(`→ /transactions/${id}`)
    const txn = await getTransaction(id)
    console.log("  ✓", { id: txn.id, status: txn.status, amount: txn.amount })
  }

  console.log("→ /refunds?page_size=3")
  const refunds = await listRefunds({ page_size: 3 })
  console.log("  ✓", { total: refunds.total, items: refunds.items.length })

  console.log("\nAll schemas validated against real responses ✓")
}

main().catch((err) => {
  console.error("Smoke test failed:", err)
  process.exit(1)
})
