"use client"

import { useEffect, useState } from "react"
import { getNotificationSummary } from "../../services/notificationsService"

export default function AiInsightsPanel() {
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState<string[]>([])

  useEffect(() => {
    let active = true

    void (async () => {
      setLoading(true)
      try {
        const { data } = await getNotificationSummary()
        if (active && data) {
          const generatedInsights = [
            data.counts.lowStockWarnings > 0
              ? `${data.counts.lowStockWarnings} low inventory items need restocking.`
              : "Inventory levels are healthy.",
            data.counts.inventoryShortages > 0
              ? `${data.counts.inventoryShortages} systems cannot be built with current stock.`
              : "No system shortages detected.",
            data.counts.taskDeadlines > 0
              ? `${data.counts.taskDeadlines} tasks are due in the next 7 days.`
              : "No immediate task deadline risk.",
            "Sales trend insight: prioritize high-value leads in negotiation stage.",
            "Customer conversion insight: follow up on quotation sent leads within 48 hours."
          ]
          setInsights(generatedInsights)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    })()

    return () => {
      active = false
    }
  }, [])

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900">AI Insights Panel</h3>
      {loading ? <p className="mt-3 text-sm text-gray-500">Generating insights...</p> : null}
      <ul className="mt-3 space-y-2">
        {insights.map((insight, index) => (
          <li key={index} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            {insight}
          </li>
        ))}
      </ul>
    </section>
  )
}
