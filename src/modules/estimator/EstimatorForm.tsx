"use client"

type EstimatorInput = {
  monthly_units: number
  location: string
  roof_size: number
  sun_hours: number
  efficiency: number
}

type EstimatorFormProps = {
  values: EstimatorInput
  onChange: (value: EstimatorInput) => void
  onSubmit: () => void
}

export default function EstimatorForm({ values, onChange, onSubmit }: EstimatorFormProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900">Estimator Inputs</h3>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <input
          type="number"
          min={0}
          value={values.monthly_units}
          onChange={(event) => onChange({ ...values, monthly_units: Number(event.target.value) || 0 })}
          placeholder="Monthly electricity units"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          value={values.location}
          onChange={(event) => onChange({ ...values, location: event.target.value })}
          placeholder="Location"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={0}
          value={values.roof_size}
          onChange={(event) => onChange({ ...values, roof_size: Number(event.target.value) || 0 })}
          placeholder="Roof size (sqft)"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={1}
          max={10}
          step="0.1"
          value={values.sun_hours}
          onChange={(event) => onChange({ ...values, sun_hours: Number(event.target.value) || 1 })}
          placeholder="Average sun hours/day"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={0.1}
          max={1}
          step="0.01"
          value={values.efficiency}
          onChange={(event) => onChange({ ...values, efficiency: Number(event.target.value) || 0.75 })}
          placeholder="System efficiency (0-1)"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
        />
      </div>
      <button
        type="button"
        onClick={onSubmit}
        className="mt-4 w-full rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white sm:w-auto"
      >
        Calculate Estimate
      </button>
    </div>
  )
}
