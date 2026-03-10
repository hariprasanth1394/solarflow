import Card from "../ui/Card";

const statCards = [
  { title: "Total Spare Parts", value: "1,248", helper: "Across all categories" },
  { title: "Low Stock Items", value: "46", helper: "Needs replenishment" },
  { title: "Systems Available", value: "112", helper: "Ready to assemble" },
  { title: "Systems Out Of Stock", value: "9", helper: "Blocked by components" },
];

const distributionData = [
  { label: "Electrical", value: 74 },
  { label: "Battery", value: 52 },
  { label: "Safety", value: 38 },
  { label: "Connectors", value: 63 },
];

const productionData = [
  { label: "3kW", value: 82 },
  { label: "10kW", value: 41 },
  { label: "25kW", value: 16 },
  { label: "50kW", value: 9 },
];

const lowStockAlerts = [
  { name: "MC4 Connector Pair", count: 38, minimum: 50 },
  { name: "12V Battery Terminal", count: 0, minimum: 25 },
  { name: "Copper Earthing Rod", count: 12, minimum: 20 },
];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-gray-900">{title}</h3>
      {children}
    </Card>
  );
}

export default function InventoryDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="p-5 shadow-sm transition hover:shadow-md">
            <p className="text-sm text-gray-500">{card.title}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{card.value}</p>
            <p className="mt-1 text-xs text-gray-400">{card.helper}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard title="Inventory Distribution">
          <div className="space-y-3">
            {distributionData.map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-violet-500" style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="System Production Capacity">
          <div className="space-y-3">
            {productionData.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="w-12 text-xs text-gray-500">{item.label}</span>
                <div className="h-7 flex-1 rounded-md bg-gray-100">
                  <div
                    className="h-7 rounded-md bg-sky-500 text-right text-xs font-medium text-white pr-2 leading-7"
                    style={{ width: `${item.value}%` }}
                  >
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Low Stock Alerts">
          <div className="space-y-3">
            {lowStockAlerts.map((item) => (
              <div key={item.name} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-800">{item.name}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Current: <span className="font-semibold text-red-600">{item.count}</span> · Minimum: {item.minimum}
                </p>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
