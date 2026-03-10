export default function Loader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-violet-600" />
      <span>{label}</span>
    </div>
  )
}
