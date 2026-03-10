import { Download, Plus } from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";
import StatusBadge from "../ui/StatusBadge";

const spareParts = [
  {
    spareName: "Solar Inverter Fuse",
    category: "Electrical",
    unit: "Nos",
    stock: 124,
    minimumStock: 60,
    supplier: "SunVolt Supplies",
    cost: "₹450",
    status: "In Stock",
  },
  {
    spareName: "MC4 Connector Pair",
    category: "Connectors",
    unit: "Pair",
    stock: 38,
    minimumStock: 50,
    supplier: "GreenGrid Components",
    cost: "₹180",
    status: "Low Stock",
  },
  {
    spareName: "12V Battery Terminal",
    category: "Battery",
    unit: "Set",
    stock: 0,
    minimumStock: 25,
    supplier: "EcoStore",
    cost: "₹220",
    status: "Out Of Stock",
  },
  {
    spareName: "DC Isolator Switch",
    category: "Safety",
    unit: "Nos",
    stock: 84,
    minimumStock: 40,
    supplier: "SolarHub",
    cost: "₹780",
    status: "In Stock",
  },
];

function getTone(status: string) {
  if (status === "In Stock") return "success" as const;
  if (status === "Low Stock") return "orange" as const;
  return "danger" as const;
}

export default function SparePartsTable() {
  return (
    <Card className="p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button className="inline-flex items-center gap-2">
            <Plus size={16} />
            Add Spare
          </Button>
          <Input placeholder="Search spare parts..." className="sm:w-64" />
          <select className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none sm:w-48">
            <option>All Categories</option>
            <option>Electrical</option>
            <option>Battery</option>
            <option>Connectors</option>
            <option>Safety</option>
          </select>
        </div>

        <Button variant="secondary" className="inline-flex items-center gap-2 self-start lg:self-auto">
          <Download size={16} />
          Export
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
              <th className="py-3">Spare Name</th>
              <th className="py-3">Category</th>
              <th className="py-3">Unit</th>
              <th className="py-3">Stock</th>
              <th className="py-3">Minimum Stock</th>
              <th className="py-3">Supplier</th>
              <th className="py-3">Cost</th>
              <th className="py-3">Status</th>
              <th className="py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {spareParts.map((item) => (
              <tr key={item.spareName} className="border-b border-gray-100 transition-colors duration-200 hover:bg-gray-50">
                <td className="py-3 font-medium text-gray-900">{item.spareName}</td>
                <td className="py-3 text-gray-600">{item.category}</td>
                <td className="py-3 text-gray-600">{item.unit}</td>
                <td className="py-3 text-gray-700">{item.stock}</td>
                <td className="py-3 text-gray-700">{item.minimumStock}</td>
                <td className="py-3 text-gray-600">{item.supplier}</td>
                <td className="py-3 text-gray-700">{item.cost}</td>
                <td className="py-3">
                  <StatusBadge label={item.status} tone={getTone(item.status)} />
                </td>
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-800"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-violet-700 transition hover:bg-violet-50"
                    >
                      Restock
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
