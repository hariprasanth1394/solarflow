"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Eye, EyeOff, Upload, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import Avatar from "@/components/ui/Avatar"
import Button from "@/components/ui/Button"
import Card from "@/components/ui/Card"
import Input from "@/components/ui/Input"

const AVATAR_STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET ?? "documents"

type ProfileForm = {
  name: string
  email: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

type UserProfile = {
  name?: string | null
  avatar_url?: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser()
        if (!authData?.user) {
          router.replace("/login")
          return
        }

        setUser(authData.user)
        setForm((prev) => ({
          ...prev,
          email: authData.user.email ?? ""
        }))

        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .select("name, avatar_url")
          .eq("id", authData.user.id)
          .single()

        if (profileError) {
          console.error("Error loading profile:", profileError)
          return
        }

        if (profileData) {
          setProfile(profileData)
          setForm((prev) => ({
            ...prev,
            name: profileData.name ?? ""
          }))
        }
      } catch (error) {
        console.error("Error loading user:", error)
      }
    }

    void loadUser()
  }, [router])

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const avatarSource = previewUrl || profile?.avatar_url

  const initials = form.name
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click()
  }

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from("users")
        .update({ name: form.name })
        .eq("id", user.id)

      if (error) throw error

      setProfile((prev) => ({ ...(prev ?? {}), name: form.name }))
      setMessage({ type: "success", text: "Profile updated successfully." })
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update profile."
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const errors = []
    if (!form.currentPassword) {
      errors.push("Current password is required.")
    }
    if (form.newPassword.length < 8) {
      errors.push("New password must be at least 8 characters.")
    }
    if (form.newPassword !== form.confirmPassword) {
      errors.push("Passwords do not match.")
    }

    if (errors.length > 0) {
      setMessage({ type: "error", text: errors.join(" ") })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: form.newPassword
      })

      if (error) throw error

      setForm((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      }))
      setMessage({ type: "success", text: "Password updated successfully." })
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update password."
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    const temporaryUrl = URL.createObjectURL(file)
    setPreviewUrl(temporaryUrl)
    setUploading(true)
    setMessage(null)

    try {
      const fileExt = file.name.split(".").pop() ?? "png"
      const filePath = `avatars/${user.id}/avatar.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_STORAGE_BUCKET)
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from(AVATAR_STORAGE_BUCKET).getPublicUrl(filePath)
      const publicUrl = data.publicUrl

      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id)

      if (updateError) throw updateError

      setProfile((prev) => ({ ...(prev ?? {}), avatar_url: publicUrl }))
      setPreviewUrl(publicUrl)
      setMessage({ type: "success", text: "Profile picture updated." })
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to upload avatar."

      setMessage({
        type: "error",
        text: errorMessage.includes("Bucket not found")
          ? `Storage bucket not found. Check NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET or create the bucket '${AVATAR_STORAGE_BUCKET}' in Supabase.`
          : errorMessage
      })
    } finally {
      setUploading(false)
    }
  }

  const passwordFeedback = form.newPassword && form.newPassword.length < 8
    ? "Use at least 8 characters."
    : form.confirmPassword && form.newPassword !== form.confirmPassword
    ? "Passwords don’t match."
    : ""

  return (
    <div className="mx-auto w-full max-w-screen-2xl py-10 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-3">
        <div className="max-w-3xl space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-600">Account</p>
          <h1 className="text-xl font-semibold text-slate-950 dark:text-white">Profile Settings</h1>
          <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Keep your account details current, personalize your profile and secure your login with a stronger password.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 rounded-3xl border px-5 py-4 shadow-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
              : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {message.type === "success" ? (
              <Check className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card variant="section" padded className="space-y-6">
          <div className="space-y-2">
            <p className="text-base font-medium text-slate-950 dark:text-white">Identity</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Personal details shown on your account.</p>
          </div>

          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleOpenFilePicker}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 p-1.5 transition hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-700"
              >
                <Avatar src={avatarSource} initials={initials || "?"} size="lg" />
              </button>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Profile photo</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tap the avatar to upload a new image.</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" variant="secondary" size="sm" onClick={handleOpenFilePicker} disabled={uploading}>
                    <Upload className="h-4 w-4" />
                    {uploading ? "Uploading..." : "Change photo"}
                  </Button>
                  <span className="text-xs text-slate-500 dark:text-slate-400">JPG, PNG up to 5MB</span>
                </div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
              <Input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Hari Prasanth"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
              <Input
                type="email"
                value={form.email}
                disabled
                className="w-full bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">Email address is managed through your authentication provider.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="submit" variant="primary" className="w-full sm:w-auto" disabled={loading}>
                <Check className="h-4 w-4" />
                {loading ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </Card>

        <Card variant="section" padded className="space-y-6">
          <div className="space-y-2">
            <p className="text-base font-medium text-slate-950 dark:text-white">Security</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Change your password and keep your account protected.</p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Current Password</label>
              <div className="relative">
                <Input
                  type={showPasswords.current ? "text" : "password"}
                  value={form.currentPassword}
                  onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  aria-label={showPasswords.current ? "Hide current password" : "Show current password"}
                >
                  {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Required to confirm your identity before updating the password.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
              <div className="relative">
                <Input
                  type={showPasswords.new ? "text" : "password"}
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  aria-label={showPasswords.new ? "Hide new password" : "Show new password"}
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Confirm Password</label>
              <div className="relative">
                <Input
                  type={showPasswords.confirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  aria-label={showPasswords.confirm ? "Hide confirm password" : "Show confirm password"}
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className={`text-sm ${passwordFeedback ? "text-rose-500" : "text-slate-500 dark:text-slate-400"}`}>
                {passwordFeedback || "Use at least 8 characters and make sure both fields match."}
              </p>
            </div>

            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              <Check className="h-4 w-4" />
              {loading ? "Updating..." : "Update password"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
