import { supabase } from "@/lib/supabaseClient"
import { cropImageToSquare, validateAvatarFile } from "@/lib/avatarUtils"
import type { AppUserProfile } from "@/lib/rbac/types"

export async function updateProfileName(fullName: string) {
  const trimmed = fullName.trim()
  if (!trimmed) {
    throw new Error("Full name is required.")
  }

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) {
    throw new Error("You must be signed in to update your profile.")
  }

  const { error } = await supabase
    .from("users")
    .update({ full_name: trimmed, name: trimmed, updated_at: new Date().toISOString() })
    .eq("auth_user_id", authData.user.id)

  if (error) {
    throw new Error(error.message)
  }

  return trimmed
}

export async function uploadProfileAvatar(file: File, _profile: AppUserProfile) {
  validateAvatarFile(file)

  const cropped = await cropImageToSquare(file, 256)
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session?.access_token) {
    throw new Error("You must be signed in to upload an avatar.")
  }

  const formData = new FormData()
  formData.append("file", cropped, "avatar.webp")

  const response = await fetch("/api/profile/avatar", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: formData,
  })

  const payload = (await response.json().catch(() => ({}))) as { avatarUrl?: string; error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to upload avatar.")
  }

  if (!payload.avatarUrl) {
    throw new Error("Avatar upload succeeded but no URL was returned.")
  }

  return payload.avatarUrl
}

export async function updateProfilePassword(options: {
  email: string
  currentPassword: string
  newPassword: string
}) {
  const { email, currentPassword, newPassword } = options

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  })

  if (verifyError) {
    throw new Error("Current password is incorrect.")
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    throw new Error(updateError.message)
  }
}

export async function getAuthProviderLabel() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return "Email"

  const provider =
    data.user.app_metadata?.provider ??
    data.user.identities?.find((identity) => identity.provider)?.provider ??
    "email"

  if (provider === "google") return "Google"
  if (provider === "email") return "Email"
  return provider.charAt(0).toUpperCase() + provider.slice(1)
}

export async function getAuthAccountMeta() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return {
      providerLabel: "Email",
      googleAccount: null as string | null,
      passwordUpdatedAt: null as string | null,
      hasPasswordIdentity: false,
    }
  }

  const provider =
    data.user.app_metadata?.provider ??
    data.user.identities?.find((identity) => identity.provider)?.provider ??
    "email"

  const hasPasswordIdentity = Boolean(data.user.identities?.some((identity) => identity.provider === "email"))

  return {
    providerLabel: provider === "google" ? "Google" : provider === "email" ? "Email" : provider,
    googleAccount: provider === "google" ? data.user.email ?? null : null,
    passwordUpdatedAt: hasPasswordIdentity ? data.user.updated_at ?? null : null,
    hasPasswordIdentity,
  }
}
