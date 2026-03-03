import {
  BarChart3,
  ClipboardList,
  Users,
  CheckCircle2,
} from "lucide-react";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";

const summaryPods = [
  {
    title: "Total Customers",
    value: "124",
    helper: "Active records in pipeline",
    icon: Users,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
  },
  {
    title: "Approvals Pending",
    value: "18",
    helper: "Waiting for authority action",
    icon: ClipboardList,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    title: "Installations In Progress",
    value: "9",
    helper: "Teams currently on-site",
    icon: BarChart3,
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
  },
  {
    title: "Completed Projects",
    value: "97",
    helper: "Delivered this quarter",
    icon: CheckCircle2,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
];

const actionRows = [
  {
    name: "Ramesh Kumar",
    stage: "Government Approval",
    status: { label: "Pending", tone: "pending" as const },
    days: 12,
  },
  {
    name: "Suresh Patel",
    stage: "Installation",
    status: { label: "In Progress", tone: "progress" as const },
    days: 7,
  },
  {
    name: "Anita Rao",
    stage: "Site Survey",
    status: { label: "Queued", tone: "neutral" as const },
    days: 3,
  },
];

function getDaysClass(days: number) {
  if (days > 10) return "text-red-600";
  if (days >= 5) return "text-yellow-600";
  return "text-gray-700";
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Overview of your solar installation workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {summaryPods.map((pod) => {
          const Icon = pod.icon;

          return (
            <Card key={pod.title} className="h-full border border-gray-100 p-5 shadow-sm hover:shadow-md">
              <div className="flex h-full items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">{pod.title}</p>
                  <p className="text-2xl font-semibold text-gray-900">{pod.value}</p>
                  <p className="text-xs text-gray-400">{pod.helper}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${pod.iconBg}`}>
                  <Icon size={18} className={pod.iconColor} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="border border-gray-100 p-5 shadow-sm hover:shadow-md">
        <div className="mb-4 space-y-1">
          <h2 className="text-lg font-semibold text-gray-900">Customers Requiring Action</h2>
          <p className="text-sm text-gray-500">Prioritize overdue pipeline stages and continue processing.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
                <th className="py-3">Customer</th>
                <th className="py-3">Stage</th>
                <th className="py-3">Status</th>
                <th className="py-3">Days in Stage</th>
                <th className="py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {actionRows.map((row) => (
                <tr key={row.name} className="border-b border-gray-100 transition hover:bg-gray-50">
                  <td className="py-3 text-gray-900">{row.name}</td>
                  <td className="py-3 text-gray-600">{row.stage}</td>
                  <td className="py-3">
                    <StatusBadge label={row.status.label} tone={row.status.tone} />
                  </td>
                  <td className={`py-3 font-medium ${getDaysClass(row.days)}`}>{row.days}</td>
                  <td className="py-3 text-right">
                    <Button variant="primary" size="sm">
                      Continue
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}