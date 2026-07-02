#!/usr/bin/env node
/**
 * Creates the public `avatars` storage bucket on Supabase.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... node scripts/setup-avatars-bucket.mjs
 */

import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: buckets, error: listError } = await admin.storage.listBuckets()
if (listError) {
  console.error("Failed to list buckets:", listError.message)
  process.exit(1)
}

if (buckets?.some((bucket) => bucket.id === "avatars")) {
  console.log("avatars bucket already exists")
  process.exit(0)
}

const { error: createError } = await admin.storage.createBucket("avatars", {
  public: true,
  fileSizeLimit: 5 * 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
})

if (createError) {
  console.error("Failed to create avatars bucket:", createError.message)
  process.exit(1)
}

console.log("avatars bucket created successfully")
