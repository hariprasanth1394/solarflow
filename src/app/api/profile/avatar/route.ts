import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database.types"
import { AVATAR_BUCKET, ensureAvatarsBucket, getSupabaseAdmin } from "@/lib/supabaseAdmin"

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

function getAuthedClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment is not configured.")
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const authedClient = getAuthedClient(accessToken)
    const { data: authData, error: authError } = await authedClient.auth.getUser(accessToken)

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await authedClient
      .from("users")
      .select("id, organization_id")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Please upload a JPG, PNG, or WEBP image." }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Image must be 5MB or smaller." }, { status: 400 })
    }

    const filePath = `${profile.organization_id}/${profile.id}/avatar.webp`
    const fileBuffer = await file.arrayBuffer()

    const admin = getSupabaseAdmin()
    let uploadClient = authedClient

    if (admin) {
      await ensureAvatarsBucket(admin)
      uploadClient = admin
    }

    const { error: uploadError } = await uploadClient.storage.from(AVATAR_BUCKET).upload(filePath, fileBuffer, {
      upsert: true,
      contentType: file.type || "image/webp",
      cacheControl: "3600",
    })

    if (uploadError) {
      const message = uploadError.message.includes("Bucket not found")
        ? "Avatar storage is not configured. Add SUPABASE_SERVICE_ROLE_KEY to your environment or run: node scripts/setup-avatars-bucket.mjs"
        : uploadError.message

      return NextResponse.json({ error: message }, { status: 500 })
    }

    const { data: publicUrlData } = uploadClient.storage.from(AVATAR_BUCKET).getPublicUrl(filePath)
    const avatarUrl = publicUrlData.publicUrl

    const profileClient = admin ?? authedClient
    const { error: updateError } = await profileClient
      .from("users")
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq("id", profile.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ avatarUrl })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Avatar upload failed." },
      { status: 500 }
    )
  }
}
