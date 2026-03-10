import type { ReactNode } from "react"
import FormLabel from "./FormLabel"
import FormError from "./FormError"

type FormFieldProps = {
  label: string
  error?: string
  children: ReactNode
}

export default function FormField({ label, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <FormLabel>{label}</FormLabel>
      {children}
      <FormError message={error} />
    </div>
  )
}
