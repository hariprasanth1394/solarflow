"use client";

type InventoryTabKey = "spare-parts" | "system-builder" | "availability" | "dashboard";

type InventoryTabsProps = {
  activeTab: InventoryTabKey;
  onTabChange: (tab: InventoryTabKey) => void;
};

const tabs: { key: InventoryTabKey; label: string }[] = [
  { key: "spare-parts", label: "Spare Parts Management" },
  { key: "system-builder", label: "Solar System Builder" },
  { key: "availability", label: "System Inventory Availability" },
  { key: "dashboard", label: "Inventory Dashboard" },
];

export default function InventoryTabs({ activeTab, onTabChange }: InventoryTabsProps) {
  return (
    <div className="sticky top-0 z-20 bg-gray-100/95 backdrop-blur-sm">
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-8 border-b border-gray-200">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className={`-mb-px border-b-2 py-4 text-sm transition-all duration-200 hover:text-violet-700 ${
                  isActive
                    ? "border-violet-600 font-semibold text-violet-700"
                    : "border-transparent font-medium text-gray-500 hover:border-violet-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
