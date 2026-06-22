import AppSpinner from "./AppSpinner"

export default function Loader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <AppSpinner size="sm" label={label} />
      <span>{label}</span>
    </div>
  )
}
