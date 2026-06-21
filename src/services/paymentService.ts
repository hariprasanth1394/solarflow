import { supabase } from "@/lib/supabaseClient"

export type PaymentRow = {
  id: string
  organization_id: string
  installation_id: string
  amount: number
  payment_date: string
  payment_method: string
  notes: string | null
  proof_url: string | null
  created_at: string
}

export async function getPaymentsByInstallationId(installationId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("installation_id", installationId)
    .order("payment_date", { ascending: false })
    .limit(100)

  if (error) throw error
  return { data }
}

export async function createPaymentForInstallation(payload: {
  installation_id: string
  organization_id: string
  amount: number
  payment_date: string
  payment_method?: string
  notes?: string | null
  proof_url?: string | null
}) {
  const insertPayload = {
    installation_id: payload.installation_id,
    organization_id: payload.organization_id,
    amount: payload.amount,
    payment_date: payload.payment_date,
    payment_method: payload.payment_method || "Unknown",
    notes: payload.notes ?? null,
    ...(payload.proof_url ? { proof_url: payload.proof_url } : {}),
  }

  const { data, error } = await supabase.from("payments").insert(insertPayload).select().single()

  if (error) throw error
  return data as PaymentRow
}

export async function uploadPaymentProof(file: File, customerId: string): Promise<string | null> {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
  const filePath = `${customerId}/payment-proofs/${Date.now()}-${sanitizedName}`

  const { error } = await supabase.storage
    .from("documents")
    .upload(filePath, file, { upsert: false })

  if (error) {
    // If the bucket doesn't support direct client uploads, skip proof storage
    // and return null (payment still records without proof URL)
    console.warn("Payment proof upload failed:", error.message)
    return null
  }
  return filePath
}
