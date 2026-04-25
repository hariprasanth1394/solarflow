import type { CustomerDetailsState } from "./types"

type CustomerStepCustomerDetailsProps = {
  value: CustomerDetailsState
  errors: Partial<Record<keyof CustomerDetailsState, string>>
  onChange: (field: keyof CustomerDetailsState, nextValue: string) => void
}

const fields: Array<{ key: keyof CustomerDetailsState; label: string; type?: string }> = [
  { key: "fullName", label: "Full Name" },
  { key: "email", label: "Email Address", type: "email" },
  { key: "phone", label: "Phone Number", type: "tel" },
  { key: "streetAddress", label: "Street Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "pinCode", label: "PIN Code" }
]

export default function CustomerStepCustomerDetails({ value, errors, onChange }: CustomerStepCustomerDetailsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {fields.map((field) => (
        <label key={field.key} className={`flex flex-col gap-1 ${field.key === "streetAddress" ? "md:col-span-2" : ""}`}>
          <span className="text-sm font-medium text-gray-700">{field.label}</span>
          <input
            type={field.type ?? "text"}
            value={value[field.key]}
            onChange={(event) => onChange(field.key, event.target.value)}
            className={`input ${
              errors[field.key] ? "border-rose-400 bg-rose-50" : ""
            }`}
          />
          {errors[field.key] ? <span className="text-xs text-rose-600">{errors[field.key]}</span> : null}
        </label>
      ))}
    </div>
  )
}
