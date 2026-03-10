import { Check } from "lucide-react"

type CustomerStepperProps = {
  step: number
  steps: Array<{ id: number; title: string }>
}

export default function CustomerStepper({ step, steps }: CustomerStepperProps) {
  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-3 sm:min-w-0 sm:gap-4">
        {steps.map((item, index) => {
          const isCompleted = step > item.id
          const isActive = step === item.id
          const isUpcoming = step < item.id

          return (
            <li key={item.id} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
                    isCompleted
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : isActive
                        ? "border-blue-500 bg-blue-50 text-blue-600"
                        : "border-gray-300 bg-white text-gray-500"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : item.id}
                </div>
                <span
                  className={`text-sm font-medium ${
                    isActive ? "text-gray-900" : isUpcoming ? "text-gray-500" : "text-emerald-700"
                  }`}
                >
                  <span className="hidden sm:inline">{item.title}</span>
                  <span className="sm:hidden">Step {item.id}</span>
                </span>
              </div>
              {index < steps.length - 1 ? <div className="h-px w-10 bg-gray-300 sm:w-16" aria-hidden="true" /> : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
