"use client";

import { useState } from "react";
import InventoryDashboard from "./InventoryDashboard";
import InventoryTabs from "./InventoryTabs";
import SolarSystemBuilder from "./SolarSystemBuilder";
import SparePartsTable from "./SparePartsTable";
import SystemAvailabilityTable from "./SystemAvailabilityTable";

type InventoryTabKey = "spare-parts" | "system-builder" | "availability" | "dashboard";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<InventoryTabKey>("spare-parts");

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Inventory Management</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage spare stock, assemble solar systems, track availability, and monitor inventory performance.
        </p>
      </div>

      <InventoryTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="pt-1">
        {activeTab === "spare-parts" && <SparePartsTable />}
        {activeTab === "system-builder" && <SolarSystemBuilder />}
        {activeTab === "availability" && <SystemAvailabilityTable />}
        {activeTab === "dashboard" && <InventoryDashboard />}
      </div>
    </section>
  );
}
