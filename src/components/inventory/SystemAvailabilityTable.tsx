import Card from "../ui/Card";
import StatusBadge from "../ui/StatusBadge";

const systemRows = [
  {
    systemName: "Residential Basic 3kW",
    capacity: "3.0 kW",
    requiredComponents: 7,
    availableSystems: 18,
    status: "Available",
  },
  {
    systemName: "Commercial Smart 10kW",
    capacity: "10.0 kW",
    requiredComponents: 10,
    availableSystems: 4,
    status: "Limited",
  },
  {
    systemName: "Industrial Hybrid 25kW",
    capacity: "25.0 kW",
    requiredComponents: 14,
    availableSystems: 0,
    status: "Out Of Stock",
  },
];

function getTone(status: string) {
  if (status === "Available") return "success" as const;
  if (status === "Limited") return "orange" as const;
  return "danger" as const;
}

export default function SystemAvailabilityTable() {
  return (
    <Card className="p-5 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
              <th className="py-3">System Name</th>
              <th className="py-3">Capacity</th>
              <th className="py-3">Required Components</th>
              <th className="py-3">Available Systems</th>
              <th className="py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {systemRows.map((row) => (
              <tr key={row.systemName} className="border-b border-gray-100 transition-colors duration-200 hover:bg-gray-50">
                <td className="py-3 font-medium text-gray-900">{row.systemName}</td>
                <td className="py-3 text-gray-700">{row.capacity}</td>
                <td className="py-3 text-gray-700">{row.requiredComponents}</td>
                <td className="py-3 text-gray-700">{row.availableSystems}</td>
                <td className="py-3">
                  <StatusBadge label={row.status} tone={getTone(row.status)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
