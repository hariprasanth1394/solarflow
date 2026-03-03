import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";

const taskRows = [
  {
    task: "Finalize government approval documents",
    customer: "Ramesh Kumar",
    priority: "High",
    priorityTone: "danger" as const,
    status: "Pending",
    statusTone: "orange" as const,
    dueDate: "Mar 05, 2026",
    dueDays: 2,
  },
  {
    task: "Confirm installation slot with team",
    customer: "Suresh Patel",
    priority: "Medium",
    priorityTone: "orange" as const,
    status: "In Progress",
    statusTone: "purple" as const,
    dueDate: "Mar 10, 2026",
    dueDays: 7,
  },
  {
    task: "Upload final completion photos",
    customer: "Priya Nair",
    priority: "Low",
    priorityTone: "gray" as const,
    status: "Created",
    statusTone: "gray" as const,
    dueDate: "Mar 15, 2026",
    dueDays: 12,
  },
];

const summary = [
  { title: "Total Tasks", value: "48" },
  { title: "Pending", value: "14" },
  { title: "High Priority", value: "6" },
];

export default function TasksPage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 overflow-x-hidden">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {summary.map((item) => (
          <Card key={item.title} className="p-5">
            <p className="text-sm text-gray-500">{item.title}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{item.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <select className="w-full md:w-56 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none">
            <option>All Priority</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <select className="w-full md:w-56 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none">
            <option>All Status</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>
        </div>
      </Card>

      <Card className="p-5">
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
                <th className="py-4">Task</th>
                <th className="py-4">Customer</th>
                <th className="py-4">Priority</th>
                <th className="py-4">Status</th>
                <th className="py-4">Due Date</th>
                <th className="py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {taskRows.map((row) => (
                <tr key={row.task} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 text-gray-900 break-words max-w-[220px]">{row.task}</td>
                  <td className="py-4">
                    <button type="button" className="text-[#6d28d9] hover:underline">
                      {row.customer}
                    </button>
                  </td>
                  <td className="py-4">
                    <StatusBadge label={row.priority} tone={row.priorityTone} />
                  </td>
                  <td className="py-4">
                    <StatusBadge label={row.status} tone={row.statusTone} />
                  </td>
                  <td className="py-4">
                    <p className="text-gray-700">{row.dueDate}</p>
                    {row.dueDays <= 3 && <p className="text-xs text-red-600">Due in {row.dueDays} days</p>}
                  </td>
                  <td className="py-4 text-right">
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-gradient-to-r from-[#6d28d9] to-[#8b5cf6] hover:opacity-95"
                    >
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-4">
          {taskRows.map((row) => (
            <div key={row.task} className="border border-gray-100 rounded-xl p-4 shadow-sm space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Task</span>
                <span className="text-gray-900 break-words max-w-[180px] text-right">{row.task}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Customer</span>
                <button type="button" className="text-[#6d28d9] hover:underline text-right break-words max-w-[150px]">
                  {row.customer}
                </button>
              </div>
              <div className="flex justify-between gap-3 items-start">
                <span className="text-gray-500">Priority</span>
                <StatusBadge label={row.priority} tone={row.priorityTone} />
              </div>
              <div className="flex justify-between gap-3 items-start">
                <span className="text-gray-500">Status</span>
                <StatusBadge label={row.status} tone={row.statusTone} />
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Due Date</span>
                <div className="text-right">
                  <p className="text-gray-700">{row.dueDate}</p>
                  {row.dueDays <= 3 && <p className="text-xs text-red-600">Due in {row.dueDays} days</p>}
                </div>
              </div>
              <div className="pt-1 flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-gradient-to-r from-[#6d28d9] to-[#8b5cf6] hover:opacity-95"
                >
                  Open
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}