export default function StatCard({ title, value, helper }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-gray-400">{helper}</p> : null}
    </article>
  )
}
