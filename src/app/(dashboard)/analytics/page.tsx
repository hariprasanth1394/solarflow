import dynamic from "next/dynamic"

const FinancialDashboard = dynamic(() => import("@/modules/analytics/FinancialDashboard"))

export default function AnalyticsRoutePage() {
  return <FinancialDashboard />
}
