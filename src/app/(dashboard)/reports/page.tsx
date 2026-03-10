import dynamic from "next/dynamic";

const ReportsPage = dynamic(() => import("@/modules/reports/ReportsPage"));

export default function ReportsRoutePage() {
  return <ReportsPage />;
}