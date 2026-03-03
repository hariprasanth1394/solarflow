import { Search } from "lucide-react";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import StatusBadge from "../../../components/ui/StatusBadge";

const installationRows = [
  {
    customer: "Ramesh Kumar",
    phone: "+91 98765 43210",
    location: "Coimbatore",
    capacity: "5.2 kW",
    stage: "Govt Approval Pending",
    statusTone: "orange" as const,
    updated: "2 hours ago",
  },
  {
    customer: "Suresh Patel",
    phone: "+91 99887 77665",
    location: "Ahmedabad",
    capacity: "6.8 kW",
    stage: "Installation",
    statusTone: "purple" as const,
    updated: "Yesterday",
  },
  {
    customer: "Anita Rao",
    phone: "+91 91234 56780",
    location: "Hyderabad",
    capacity: "4.0 kW",
    stage: "Approved",
    statusTone: "blue" as const,
    updated: "3 days ago",
  },
  {
    customer: "Priya Nair",
    phone: "+91 93456 78120",
    location: "Kochi",
    capacity: "8.4 kW",
    stage: "Closed",
    statusTone: "green" as const,
    updated: "5 days ago",
  },
  {
    customer: "Karthik Menon",
    phone: "+91 90123 45678",
    location: "Chennai",
    capacity: "3.6 kW",
    stage: "Created",
    statusTone: "gray" as const,
    updated: "1 week ago",
  },
];

export default function CustomersPage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Installation Pipeline</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage every solar installation lifecycle.
          </p>
        </div>
        <Button variant="primary">+ Add Installation</Button>
      </div>

      <Card className="p-5">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative w-full md:max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Search installations"
              className="pl-9"
            />
          </div>
          <select
            className="w-full md:w-56 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
            defaultValue="all"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Govt Approval Pending</option>
            <option value="installation">Installation</option>
            <option value="approved">Approved</option>
            <option value="closed">Closed</option>
            <option value="created">Created</option>
          </select>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 space-y-1">
          <h2 className="text-lg font-semibold text-gray-900">All Installations</h2>
          <p className="text-sm text-gray-500">Sorted by last updated</p>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
                <th className="py-4">Customer Name</th>
                <th className="py-4">Phone</th>
                <th className="py-4">Location</th>
                <th className="py-4">System Capacity</th>
                <th className="py-4">Current Stage</th>
                <th className="py-4">Last Updated</th>
                <th className="py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {installationRows.map((row) => (
                <tr key={row.customer} className="border-b border-gray-100 transition hover:bg-gray-50">
                  <td className="py-4 font-medium text-gray-900 max-w-[150px] truncate">{row.customer}</td>
                  <td className="py-4 text-gray-600">{row.phone}</td>
                  <td className="py-4 text-gray-600 max-w-[150px] truncate">{row.location}</td>
                  <td className="py-4 text-gray-600">{row.capacity}</td>
                  <td className="py-4">
                    <StatusBadge label={row.stage} tone={row.statusTone} />
                  </td>
                  <td className="py-4 text-gray-500">{row.updated}</td>
                  <td className="py-4 text-right">
                    <Button variant="secondary" size="sm">
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-4">
          {installationRows.map((row) => (
            <div key={row.customer} className="border border-gray-100 rounded-xl p-4 shadow-sm space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Customer Name</span>
                <span className="font-medium text-gray-900 break-words max-w-[150px] text-right">{row.customer}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Phone</span>
                <span className="text-gray-700 text-right">{row.phone}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Location</span>
                <span className="text-gray-700 break-words max-w-[150px] text-right">{row.location}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">System Capacity</span>
                <span className="text-gray-700 text-right">{row.capacity}</span>
              </div>
              <div className="flex justify-between gap-3 items-start">
                <span className="text-gray-500">Current Stage</span>
                <StatusBadge label={row.stage} tone={row.statusTone} />
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Last Updated</span>
                <span className="text-gray-700 text-right">{row.updated}</span>
              </div>
              <div className="pt-1 flex justify-end">
                <Button variant="secondary" size="sm">
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