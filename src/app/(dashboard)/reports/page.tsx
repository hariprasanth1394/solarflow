import Card from "../../../components/ui/Card";

const summary = [
  { title: "Total Revenue", value: "₹1.92Cr" },
  { title: "Completed Projects", value: "97" },
  { title: "Active Projects", value: "21" },
  { title: "Total Capacity", value: "684 kW" },
];

const chartSections = [
  "Customer Acquisition",
  "Project Status Distribution",
  "Revenue Trend",
  "Average Project Duration",
];

export default function ReportsPage() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.title} className="p-5">
            <p className="text-sm text-gray-500">{item.title}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{item.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {chartSections.map((title) => (
          <Card key={title} className="p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            </div>
            <div className="h-64 rounded-lg border border-dashed border-gray-200 bg-gray-50" />
          </Card>
        ))}
      </div>
    </div>
  );
}