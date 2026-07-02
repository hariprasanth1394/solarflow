"use client"

import { Sun } from "lucide-react"
import { useState } from "react"
import ModulePageHeader from "@/components/layout/ModulePageHeader"
import EstimatorForm from "./EstimatorForm"
import EstimatorResult from "./EstimatorResult"

type EstimatorInput = {
  monthly_units: number
  location: string
  roof_size: number
  sun_hours: number
  efficiency: number
}

const defaultValues: EstimatorInput = {
  monthly_units: 500,
  location: "",
  roof_size: 1000,
  sun_hours: 5,
  efficiency: 0.75
}

export default function SolarEstimatorPage() {
  const [values, setValues] = useState<EstimatorInput>(defaultValues)
  const [result, setResult] = useState<{
    required_kw: number
    number_of_panels: number
    estimated_yearly_generation: number
    estimated_savings: number
    estimated_roi_years: number
  } | null>(null)

  const calculate = () => {
    const required_kw = values.monthly_units / (30 * values.sun_hours * values.efficiency)
    const number_of_panels = Math.ceil((required_kw * 1000) / 550)
    const estimated_yearly_generation = required_kw * values.sun_hours * 365 * values.efficiency
    const estimated_savings = estimated_yearly_generation * 8
    const estimated_roi_years = (required_kw * 55000) / Math.max(estimated_savings, 1)

    setResult({
      required_kw,
      number_of_panels,
      estimated_yearly_generation,
      estimated_savings,
      estimated_roi_years
    })
  }

  return (
    <div className="space-y-5">
      <ModulePageHeader title="Solar Estimator" icon={Sun} />
      <EstimatorForm values={values} onChange={setValues} onSubmit={calculate} />
      <EstimatorResult result={result} />
    </div>
  )
}
