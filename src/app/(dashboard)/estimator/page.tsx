import dynamic from "next/dynamic"

const SolarEstimatorPage = dynamic(() => import("@/modules/estimator/SolarEstimatorPage"))

export default function EstimatorRoutePage() {
  return <SolarEstimatorPage />
}
