export default function Toast({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-md">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="text-sm text-slate-600">{description}</p>
    </div>
  )
}
