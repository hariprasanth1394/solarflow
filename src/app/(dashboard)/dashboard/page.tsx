import dynamic from "next/dynamic";

const DashboardPage = dynamic(() => import("@/modules/dashboard/DashboardPage"));

export default function DashboardRoutePage() {
  return <DashboardPage />;
}