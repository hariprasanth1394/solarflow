type ValidationMap = Record<string, string | undefined>

export default function FormValidation({ errors }: { errors: ValidationMap }) {
  const entries = Object.entries(errors).filter(([, value]) => Boolean(value))
  if (entries.length === 0) return null

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
      <p className="font-semibold">Please fix the following fields:</p>
      <ul className="mt-1 list-disc pl-5">
        {entries.map(([field, message]) => (
          <li key={field}>{message}</li>
        ))}
      </ul>
    </div>
  )
}
