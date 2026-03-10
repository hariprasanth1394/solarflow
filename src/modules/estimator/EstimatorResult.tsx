"use client"

type EstimatorResultProps = {
  result: {
    required_kw: number
    number_of_panels: number
    estimated_yearly_generation: number
    estimated_savings: number
    estimated_roi_years: number
  } | null
}

export default function EstimatorResult({ result }: EstimatorResultProps) {
  if (!result) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm">
        Fill the form and calculate to view solar estimation results.
      </div>
    )
  }

  const cards = [
    { label: "Required Capacity", value: `${result.required_kw.toFixed(2)} kW` },
    { label: "Number of Panels", value: String(result.number_of_panels) },
    { label: "Yearly Generation", value: `${result.estimated_yearly_generation.toFixed(0)} units` },
    { label: "Estimated Savings", value: `₹ ${result.estimated_savings.toFixed(0)}` },
    { label: "Estimated ROI", value: `${result.estimated_roi_years.toFixed(1)} years` }
  ]

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">{card.label}</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">{card.value}</p>
        </div>
      ))}
    </div>
  )
}
