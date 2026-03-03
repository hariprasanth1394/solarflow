import { Download, Eye, FileText } from "lucide-react";
import Card from "../../../components/ui/Card";
import StatusBadge from "../../../components/ui/StatusBadge";

const summary = [
  { title: "Total Documents", value: "286" },
  { title: "Pending Review", value: "32" },
  { title: "Approved", value: "214" },
];

const documentRows = [
  {
    name: "Net Metering Application",
    customer: "Ramesh Kumar",
    type: "Application",
    status: "Pending",
    tone: "orange" as const,
    date: "Mar 02, 2026",
    size: "1.2 MB",
  },
  {
    name: "Site Survey Report",
    customer: "Suresh Patel",
    type: "Report",
    status: "Approved",
    tone: "blue" as const,
    date: "Feb 28, 2026",
    size: "2.8 MB",
  },
  {
    name: "Installation Completion Form",
    customer: "Priya Nair",
    type: "Compliance",
    status: "Closed",
    tone: "green" as const,
    date: "Feb 25, 2026",
    size: "900 KB",
  },
];

export default function DocumentsPage() {
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
            <option>All Types</option>
            <option>Application</option>
            <option>Report</option>
            <option>Compliance</option>
          </select>
          <select className="w-full md:w-56 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none">
            <option>All Status</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Closed</option>
          </select>
        </div>
      </Card>

      <Card className="p-5">
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
                <th className="py-4">Document Name</th>
                <th className="py-4">Customer</th>
                <th className="py-4">Type</th>
                <th className="py-4">Status</th>
                <th className="py-4">Uploaded Date</th>
                <th className="py-4">Size</th>
                <th className="py-4 text-right">View</th>
                <th className="py-4 text-right">Download</th>
              </tr>
            </thead>
            <tbody>
              {documentRows.map((row) => (
                <tr key={row.name} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4">
                    <div className="flex items-center gap-2 text-gray-900 max-w-[220px]">
                      <FileText size={16} className="text-gray-500" />
                      <span className="truncate">{row.name}</span>
                    </div>
                  </td>
                  <td className="py-4 text-gray-600 max-w-[150px] truncate">{row.customer}</td>
                  <td className="py-4 text-gray-600">{row.type}</td>
                  <td className="py-4">
                    <StatusBadge label={row.status} tone={row.tone} />
                  </td>
                  <td className="py-4 text-gray-600">{row.date}</td>
                  <td className="py-4 text-gray-600">{row.size}</td>
                  <td className="py-4 text-right">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                  <td className="py-4 text-right">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Download size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-4">
          {documentRows.map((row) => (
            <div key={row.name} className="border border-gray-100 rounded-xl p-4 shadow-sm space-y-2 text-sm">
              <div className="flex justify-between gap-3 items-start">
                <span className="text-gray-500">Document</span>
                <div className="flex items-center gap-2 max-w-[180px]">
                  <FileText size={16} className="text-gray-500 shrink-0" />
                  <span className="text-gray-900 break-words text-right">{row.name}</span>
                </div>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Customer</span>
                <span className="text-gray-700 break-words max-w-[150px] text-right">{row.customer}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Type</span>
                <span className="text-gray-700 text-right">{row.type}</span>
              </div>
              <div className="flex justify-between gap-3 items-start">
                <span className="text-gray-500">Status</span>
                <StatusBadge label={row.status} tone={row.tone} />
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Uploaded Date</span>
                <span className="text-gray-700 text-right">{row.date}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Size</span>
                <span className="text-gray-700 text-right">{row.size}</span>
              </div>
              <div className="pt-1 flex justify-end gap-2">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                >
                  <Eye size={16} />
                </button>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                >
                  <Download size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}