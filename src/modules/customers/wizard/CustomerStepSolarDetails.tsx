import type { AvailableSolarSystem } from "@/services/inventoryService"
import type { SolarDetailsState } from "./types"

type CustomerStepSolarDetailsProps = {
  value: SolarDetailsState
  errors: Partial<Record<keyof SolarDetailsState, string>>
  systemsLoading: boolean
  systems: AvailableSolarSystem[]
  onFieldChange: (field: keyof SolarDetailsState, nextValue: string) => void
}

export default function CustomerStepSolarDetails({
  value,
  errors,
  systemsLoading,
  systems,
  onFieldChange
}: CustomerStepSolarDetailsProps) {
  const noSystemsAvailable = !systemsLoading && systems.length === 0

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium text-gray-700">Solar System Package</span>
        <select
          value={value.systemId}
          onChange={(event) => {
            const selectedId = event.target.value
            const selected = systems.find((item) => item.system_id === selectedId)
            onFieldChange("systemId", selectedId)
            onFieldChange("systemCapacity", selected?.capacity_kw ? `${selected.capacity_kw}` : "")
          }}
          className={`dropdown ${
            errors.systemId ? "border-rose-400 bg-rose-50" : ""
          }`}
          disabled={systemsLoading || noSystemsAvailable}
        >
          <option value="">
            {systemsLoading ? "Loading available systems..." : noSystemsAvailable ? "No available systems" : "Select a package"}
          </option>
          {systems.map((system) => (
            <option key={system.system_id ?? `${system.system_name}-${system.capacity_kw}`} value={system.system_id ?? ""}>
              {(system.system_name ?? "System") +
                ` (${system.capacity_kw ?? 0} kW) — ${system.available_systems ?? 0} available`}
            </option>
          ))}
        </select>
        {errors.systemId ? <span className="text-xs text-rose-600">{errors.systemId}</span> : null}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">System Capacity</span>
        <input
          value={value.systemCapacity}
          readOnly
          placeholder="Auto populated"
          className="input bg-slate-50"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Payment Status</span>
        <select
          value={value.paymentStatus}
          onChange={(event) => onFieldChange("paymentStatus", event.target.value)}
          className={`dropdown ${
            errors.paymentStatus ? "border-rose-400 bg-rose-50" : ""
          }`}
        >
          <option value="">Select payment status</option>
          <option value="Pending">Pending</option>
          <option value="Partial">Partial</option>
          <option value="Paid">Paid</option>
        </select>
        {errors.paymentStatus ? <span className="text-xs text-rose-600">{errors.paymentStatus}</span> : null}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Estimated Installation Date</span>
        <input
          type="date"
          value={value.estimatedInstallationDate}
          onChange={(event) => onFieldChange("estimatedInstallationDate", event.target.value)}
          className={`input ${
            errors.estimatedInstallationDate ? "border-rose-400 bg-rose-50" : ""
          }`}
        />
        {errors.estimatedInstallationDate ? <span className="text-xs text-rose-600">{errors.estimatedInstallationDate}</span> : null}
      </label>

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium text-gray-700">Additional Notes</span>
        <textarea
          rows={4}
          value={value.additionalNotes}
          onChange={(event) => onFieldChange("additionalNotes", event.target.value)}
          className="textarea"
          placeholder="Add installation, payment, or site notes"
        />
      </label>
    </div>
  )
}
