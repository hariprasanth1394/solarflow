import { redirect } from 'next/navigation'

export default async function InventorySparesRoute({
  searchParams
}: {
  searchParams: Promise<{ updated?: string }>
}) {
  const params = await searchParams
  const updated = typeof params.updated === 'string' && params.updated ? `&updated=${encodeURIComponent(params.updated)}` : ''

  redirect(`/inventory?tab=spares${updated}`)
}