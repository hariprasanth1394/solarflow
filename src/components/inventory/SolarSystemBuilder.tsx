"use client";

import { Eye, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import Button from "../ui/Button";
import Card from "../ui/Card";

type SystemComponent = {
  spareName: string;
  quantityRequired: number;
  unit: string;
};

type SolarSystem = {
  systemName: string;
  capacity: string;
  componentsCount: number;
  lastUpdated: string;
  components: SystemComponent[];
};

const systems: SolarSystem[] = [
  {
    systemName: "Residential Basic 3kW",
    capacity: "3.0",
    componentsCount: 7,
    lastUpdated: "Mar 01, 2026",
    components: [
      { spareName: "Mono PERC Panel 540W", quantityRequired: 6, unit: "Nos" },
      { spareName: "On-Grid Inverter 3kW", quantityRequired: 1, unit: "Nos" },
      { spareName: "DC Cable 4 sqmm", quantityRequired: 40, unit: "Meters" },
      { spareName: "MC4 Connector Pair", quantityRequired: 6, unit: "Pair" },
    ],
  },
  {
    systemName: "Commercial Smart 10kW",
    capacity: "10.0",
    componentsCount: 10,
    lastUpdated: "Feb 28, 2026",
    components: [
      { spareName: "Mono PERC Panel 540W", quantityRequired: 19, unit: "Nos" },
      { spareName: "On-Grid Inverter 10kW", quantityRequired: 1, unit: "Nos" },
      { spareName: "Galvanized Mounting Rail", quantityRequired: 24, unit: "Nos" },
      { spareName: "DC Isolator Switch", quantityRequired: 2, unit: "Nos" },
    ],
  },
  {
    systemName: "Industrial Hybrid 25kW",
    capacity: "25.0",
    componentsCount: 14,
    lastUpdated: "Feb 24, 2026",
    components: [
      { spareName: "Bi-Facial Panel 600W", quantityRequired: 42, unit: "Nos" },
      { spareName: "Hybrid Inverter 25kW", quantityRequired: 1, unit: "Nos" },
      { spareName: "Battery Pack 48V", quantityRequired: 8, unit: "Nos" },
      { spareName: "Battery Terminal", quantityRequired: 16, unit: "Set" },
    ],
  },
];

export default function SolarSystemBuilder() {
  const [activeSystemName, setActiveSystemName] = useState<string | null>(null);

  const activeSystem = useMemo(
    () => systems.find((item) => item.systemName === activeSystemName) ?? null,
    [activeSystemName]
  );

  return (
    <>
      <Card className="p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <Button className="inline-flex items-center gap-2">
            <Plus size={16} />
            Create System
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
                <th className="py-3">System Name</th>
                <th className="py-3">Capacity (kW)</th>
                <th className="py-3">Components Count</th>
                <th className="py-3">Last Updated</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {systems.map((system) => (
                <tr key={system.systemName} className="border-b border-gray-100 transition-colors duration-200 hover:bg-gray-50">
                  <td className="py-3 font-medium text-gray-900">{system.systemName}</td>
                  <td className="py-3 text-gray-700">{system.capacity}</td>
                  <td className="py-3 text-gray-700">{system.componentsCount}</td>
                  <td className="py-3 text-gray-600">{system.lastUpdated}</td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setActiveSystemName(system.systemName)}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
                    >
                      <Eye size={14} />
                      View Components
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {activeSystem && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setActiveSystemName(null)} />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-xl border-l border-gray-200 bg-white shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{activeSystem.systemName}</h3>
                  <p className="text-sm text-gray-500">Component requirements</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSystemName(null)}
                  className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
                      <th className="py-3">Spare Name</th>
                      <th className="py-3">Quantity Required</th>
                      <th className="py-3">Unit</th>
                      <th className="py-3 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSystem.components.map((component) => (
                      <tr
                        key={component.spareName}
                        className="border-b border-gray-100 transition-colors duration-200 hover:bg-gray-50"
                      >
                        <td className="py-3 text-gray-800">{component.spareName}</td>
                        <td className="py-3 text-gray-700">{component.quantityRequired}</td>
                        <td className="py-3 text-gray-600">{component.unit}</td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
