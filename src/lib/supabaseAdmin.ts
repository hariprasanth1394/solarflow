import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"

const AVATAR_BUCKET = "avatars"

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    return null
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

export async function ensureAvatarsBucket(admin: ReturnType<typeof createClient<Database>>) {
  const { data: buckets, error: listError } = await admin.storage.listBuckets()
  if (listError) {
    throw new Error(listError.message)
  }

  const exists = buckets?.some((bucket) => bucket.id === AVATAR_BUCKET || bucket.name === AVATAR_BUCKET)
  if (exists) return

  const { error: createError } = await admin.storage.createBucket(AVATAR_BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  })

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new Error(createError.message)
  }
}

export { AVATAR_BUCKET }
