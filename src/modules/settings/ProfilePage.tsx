"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  Activity,
  AlertCircle,
  Building2,
  Camera,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Shield,
  User,
} from "lucide-react"
import Avatar from "@/components/ui/Avatar"
import AppSpinner from "@/components/ui/AppSpinner"
import Button from "@/components/ui/Button"
import ModulePageHeader from "@/components/layout/ModulePageHeader"
import Input from "@/components/ui/Input"
import PasswordStrengthMeter, { getPasswordValidationErrors } from "@/components/ui/PasswordStrengthMeter"
import RoleBadge from "@/components/ui/RoleBadge"
import { getRoleBadgeLabel } from "@/components/ui/Avatar"
import { useAuthContext } from "@/contexts/AuthContext"
import { getInitials, withAvatarCacheBust } from "@/lib/avatarUtils"
import {
  getAuthAccountMeta,
  updateProfileName,
  updateProfilePassword,
  uploadProfileAvatar,
} from "@/services/profileService"
import { formatDateTimeUTC } from "@/utils/dateFormat"

type SettingsTab = "general" | "security" | "activity"

type ToastState = {
  type: "success" | "error"
  text: string
} | null

type AccountMeta = {
  providerLabel: string
  googleAccount: string | null
  passwordUpdatedAt: string | null
  hasPasswordIdentity: boolean
}

const TABS: { id: SettingsTab; label: string; icon: typeof User; description: string }[] = [
  { id: "general", label: "General", icon: User, description: "Profile photo and personal details" },
  { id: "security", label: "Security", icon: Shield, description: "Password and authentication" },
  { id: "activity", label: "Activity", icon: Activity, description: "Sign-in history and metadata" },
]

function formatSavedLabel(savedAt: Date | null) {
  if (!savedAt) return null
  const diffMs = Date.now() - savedAt.getTime()
  if (diffMs < 60_000) return "Saved just now"
  if (diffMs < 3_600_000) return `Saved ${Math.max(1, Math.floor(diffMs / 60_000))}m ago`
  return `Saved at ${savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
}

function ActionButton({
  loading,
  loadingLabel,
  label,
  disabled,
  type = "button",
  onClick,
  className = "",
}: {
  loading: boolean
  loadingLabel: string
  label: string
  disabled?: boolean
  type?: "button" | "submit"
  onClick?: () => void
  className?: string
}) {
  return (
    <Button
      type={type}
      variant="primary"
      className={`sf-account-action-btn ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      onClick={onClick}
    >
      {loading ? (
        <>
          <AppSpinner size="xs" variant="onPrimary" label={loadingLabel} />
          {loadingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  )
}

function PanelHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="sf-account-panel-header">
      <h2 id="account-panel-title" className="sf-account-panel-title">{title}</h2>
      <p className="sf-account-panel-description">{description}</p>
    </header>
  )
}

function SettingRow({
  label,
  hint,
  htmlFor,
  children,
  border = true,
}: {
  label: string
  hint?: string
  htmlFor?: string
  children: ReactNode
  border?: boolean
}) {
  return (
    <div className={`sf-account-setting-row ${border ? "" : "sf-account-setting-row--plain"}`}>
      <div className="sf-account-setting-meta">
        <label className="sf-account-setting-label" htmlFor={htmlFor}>
          {label}
        </label>
        {hint ? <p className="sf-account-setting-hint">{hint}</p> : null}
      </div>
      <div className="sf-account-setting-control">{children}</div>
    </div>
  )
}

function ReadonlyValue({ value, badge }: { value: string; badge?: ReactNode }) {
  return (
    <div className="sf-account-readonly-value">
      <span>{value}</span>
      {badge}
    </div>
  )
}

function ActivityItem({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="sf-account-activity-item">
      <span className={`sf-account-activity-dot ${accent ? "sf-account-activity-dot--accent" : ""}`} aria-hidden="true" />
      <div className="sf-account-activity-copy">
        <span className="sf-account-activity-label">{label}</span>
        <span className="sf-account-activity-value">{value}</span>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { profile, loading: profileLoading, refreshProfile } = useAuthContext()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [activeTab, setActiveTab] = useState<SettingsTab>("general")
  const [fullName, setFullName] = useState("")
  const [savedName, setSavedName] = useState("")
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [avatarVersion, setAvatarVersion] = useState<number>(Date.now())

  const [accountMeta, setAccountMeta] = useState<AccountMeta | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [passwordSavedAt, setPasswordSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    if (!profile) return
    const nextName = profile.fullName ?? ""
    setFullName(nextName)
    setSavedName(nextName)
  }, [profile])

  useEffect(() => {
    void getAuthAccountMeta().then(setAccountMeta)
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const displayName = fullName.trim() || profile?.email || "User"
  const initials = getInitials(displayName)
  const avatarSrc = previewUrl || withAvatarCacheBust(profile?.avatarUrl, avatarVersion || profile?.updatedAt)

  const isProfileDirty = useMemo(() => fullName.trim() !== savedName.trim(), [fullName, savedName])

  const passwordErrors = getPasswordValidationErrors(newPassword, confirmPassword)
  const canUpdatePassword =
    Boolean(accountMeta?.hasPasswordIdentity) &&
    Boolean(currentPassword) &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    !updatingPassword

  const activeTabMeta = TABS.find((tab) => tab.id === activeTab) ?? TABS[0]

  const handleSaveProfile = async () => {
    if (!profile || !isProfileDirty) return
    setSavingProfile(true)
    setToast(null)
    try {
      const updatedName = await updateProfileName(fullName)
      await refreshProfile()
      setSavedName(updatedName)
      setFullName(updatedName)
      setSavedAt(new Date())
      setToast({ type: "success", text: "Profile updated successfully." })
    } catch (error) {
      setToast({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update profile.",
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !profile) return

    const temporaryUrl = URL.createObjectURL(file)
    setPreviewUrl(temporaryUrl)
    setUploadingAvatar(true)
    setToast(null)

    try {
      const avatarUrl = await uploadProfileAvatar(file, profile)
      setAvatarVersion(Date.now())
      setPreviewUrl(avatarUrl)
      await refreshProfile()
      setToast({ type: "success", text: "Profile photo updated." })
    } catch (error) {
      setPreviewUrl(null)
      setToast({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to upload avatar.",
      })
    } finally {
      setUploadingAvatar(false)
      event.target.value = ""
    }
  }

  const handleUpdatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile || !accountMeta?.hasPasswordIdentity) return

    if (!currentPassword) {
      setToast({ type: "error", text: "Current password is required." })
      return
    }
    if (passwordErrors.length > 0) {
      setToast({ type: "error", text: passwordErrors.join(" ") })
      return
    }

    setUpdatingPassword(true)
    setToast(null)
    try {
      await updateProfilePassword({ email: profile.email, currentPassword, newPassword })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPasswordSavedAt(new Date())
      setAccountMeta(await getAuthAccountMeta())
      setToast({ type: "success", text: "Password updated successfully." })
    } catch (error) {
      setToast({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update password.",
      })
    } finally {
      setUpdatingPassword(false)
    }
  }

  if (profileLoading && !profile) {
    return (
      <div className="sf-account-surface">
        <div className="sf-account-shell sf-account-shell--contained sf-account-shell--loading">
          <div className="sf-account-sidebar sf-account-sidebar--skeleton" />
          <div className="sf-account-panel sf-account-panel--skeleton" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="sf-account-surface">
        <div className="sf-account-toast sf-account-toast--error">Unable to load your profile.</div>
      </div>
    )
  }

  return (
    <div className="sf-account-surface">
      <ModulePageHeader title="Account" icon={User} />

      {toast ? (
        <div className={`sf-account-toast sf-account-toast--${toast.type}`} role="status">
          {toast.type === "success" ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{toast.text}</span>
        </div>
      ) : null}

      <div className="sf-account-shell sf-account-shell--contained">
        <aside className="sf-account-sidebar">
          <div className="sf-account-identity">
            <button
              type="button"
              className="sf-account-identity-avatar"
              onClick={() => {
                setActiveTab("general")
                fileInputRef.current?.click()
              }}
              disabled={uploadingAvatar}
              aria-label="Change profile photo"
            >
              <Avatar src={avatarSrc} initials={initials} size="lg" />
              <span className="sf-account-identity-camera" aria-hidden="true">
                {uploadingAvatar ? <AppSpinner size="xs" variant="onPrimary" label="Uploading" /> : <Camera className="h-3 w-3" />}
              </span>
            </button>
            <div className="sf-account-identity-copy">
              <p className="sf-account-identity-name">{displayName}</p>
              <p className="sf-account-identity-email">{profile.email}</p>
              <div className="sf-account-identity-badges">
                <RoleBadge role={profile.role} />
                <span className="sf-account-status-pill">
                  <span className="sf-account-status-dot" aria-hidden="true" />
                  Active
                </span>
              </div>
            </div>
          </div>

          <nav className="sf-account-nav" aria-label="Account settings sections">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`sf-account-nav-item ${isActive ? "sf-account-nav-item--active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="sf-account-nav-icon" aria-hidden="true">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="sf-account-nav-copy">
                    <span className="sf-account-nav-label">{tab.label}</span>
                    <span className="sf-account-nav-desc">{tab.description}</span>
                  </span>
                  <ChevronRight className="sf-account-nav-chevron h-4 w-4" aria-hidden="true" />
                </button>
              )
            })}
          </nav>
        </aside>

        <section className="sf-account-panel" aria-labelledby="account-panel-title">
          <PanelHeader title={activeTabMeta.label} description={activeTabMeta.description} />

          {activeTab === "general" ? (
            <div className="sf-account-panel-body">
              <div className="sf-account-settings-group">
                <SettingRow label="Profile photo" hint="Square image works best. JPG, PNG, or WEBP up to 5MB.">
                  <div className="sf-account-photo-control">
                    <Avatar src={avatarSrc} initials={initials} size="lg" />
                    <div className="sf-account-photo-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        aria-busy={uploadingAvatar}
                      >
                        {uploadingAvatar ? (
                          <>
                            <AppSpinner size="xs" label="Uploading" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Camera className="h-4 w-4" />
                            Upload photo
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </SettingRow>

                <SettingRow label="Full name" htmlFor="account-full-name" hint="Shown to your team across SolarFlow.">
                  <Input
                    id="account-full-name"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Enter your full name"
                    className="sf-account-input"
                  />
                </SettingRow>

                <SettingRow label="Email address">
                  <ReadonlyValue
                    value={profile.email}
                    badge={<span className="sf-account-lock-badge"><Lock className="h-3 w-3" />Managed</span>}
                  />
                </SettingRow>

                <SettingRow label="Role">
                  <ReadonlyValue value={getRoleBadgeLabel(profile.role)} />
                </SettingRow>

                <SettingRow label="Organization" border={false}>
                  <ReadonlyValue value={profile.organizationName ?? "—"} />
                </SettingRow>
              </div>

              <footer className="sf-account-panel-footer">
                <p
                  className={`sf-account-footer-status ${
                    isProfileDirty ? "sf-account-footer-status--dirty" : savedAt ? "sf-account-footer-status--saved" : ""
                  }`}
                >
                  {isProfileDirty ? "Unsaved changes" : formatSavedLabel(savedAt) ?? "No pending changes"}
                </p>
                <ActionButton
                  loading={savingProfile}
                  loadingLabel="Saving..."
                  label="Save changes"
                  disabled={!isProfileDirty}
                  onClick={() => void handleSaveProfile()}
                />
              </footer>
            </div>
          ) : null}

          {activeTab === "security" ? (
            <div className="sf-account-panel-body">
              {!accountMeta?.hasPasswordIdentity ? (
                <div className="sf-account-notice">
                  <div className="sf-account-notice-icon" aria-hidden="true">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="sf-account-notice-title">External authentication</p>
                    <p className="sf-account-notice-text">
                      You sign in with <strong>{accountMeta?.providerLabel ?? "an external provider"}</strong>. Password
                      changes are managed from your provider&apos;s security settings.
                    </p>
                    {accountMeta?.googleAccount ? (
                      <p className="sf-account-notice-meta">Connected account: {accountMeta.googleAccount}</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdatePassword} className="sf-account-settings-group">
                  <SettingRow label="Current password" htmlFor="account-current-password">
                    <div className="sf-account-password-field">
                      <Input
                        id="account-current-password"
                        type={showPasswords.current ? "text" : "password"}
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        className="sf-account-input sf-account-password-input"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="sf-account-password-toggle"
                        onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
                        aria-label={showPasswords.current ? "Hide current password" : "Show current password"}
                      >
                        {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </SettingRow>

                  <SettingRow label="New password" htmlFor="account-new-password">
                    <div className="sf-account-password-stack">
                      <div className="sf-account-password-field">
                        <Input
                          id="account-new-password"
                          type={showPasswords.new ? "text" : "password"}
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          className="sf-account-input sf-account-password-input"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className="sf-account-password-toggle"
                          onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
                          aria-label={showPasswords.new ? "Hide new password" : "Show new password"}
                        >
                          {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <PasswordStrengthMeter password={newPassword} />
                    </div>
                  </SettingRow>

                  <SettingRow label="Confirm password" htmlFor="account-confirm-password" border={false}>
                    <div className="sf-account-password-field">
                      <Input
                        id="account-confirm-password"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        className="sf-account-input sf-account-password-input"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="sf-account-password-toggle"
                        onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                        aria-label={showPasswords.confirm ? "Hide confirm password" : "Show confirm password"}
                      >
                        {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </SettingRow>

                  <footer className="sf-account-panel-footer">
                    <p className={`sf-account-footer-status ${passwordSavedAt ? "sf-account-footer-status--saved" : ""}`}>
                      {formatSavedLabel(passwordSavedAt) ?? "Minimum 8 characters recommended."}
                    </p>
                    <ActionButton
                      type="submit"
                      loading={updatingPassword}
                      loadingLabel="Updating..."
                      label="Update password"
                      disabled={!canUpdatePassword}
                    />
                  </footer>
                </form>
              )}
            </div>
          ) : null}

          {activeTab === "activity" ? (
            <div className="sf-account-panel-body">
              <div className="sf-account-activity-list">
                <ActivityItem
                  label="Last login"
                  value={formatDateTimeUTC(profile.lastLoginAt, "Not recorded yet")}
                  accent
                />
                <ActivityItem label="Sign-in provider" value={accountMeta?.providerLabel ?? "—"} />
                <ActivityItem label="Google account" value={accountMeta?.googleAccount ?? "Not connected"} />
                <ActivityItem label="Member since" value={formatDateTimeUTC(profile.createdAt, "—")} />
                <ActivityItem
                  label="Last password change"
                  value={
                    accountMeta?.hasPasswordIdentity
                      ? formatDateTimeUTC(accountMeta.passwordUpdatedAt, "Not available")
                      : "Managed by provider"
                  }
                />
                <ActivityItem label="Organization" value={profile.organizationName ?? "—"} />
              </div>

              <div className="sf-account-summary-grid">
                <div className="sf-account-summary-card">
                  <Mail className="h-4 w-4 text-[var(--primary-start)]" />
                  <div>
                    <p className="sf-account-summary-label">Email</p>
                    <p className="sf-account-summary-value">{profile.email}</p>
                  </div>
                </div>
                <div className="sf-account-summary-card">
                  <Building2 className="h-4 w-4 text-[var(--primary-end)]" />
                  <div>
                    <p className="sf-account-summary-label">Workspace</p>
                    <p className="sf-account-summary-value">{profile.organizationName ?? "—"}</p>
                  </div>
                </div>
                <div className="sf-account-summary-card">
                  <KeyRound className="h-4 w-4 text-[var(--primary-start)]" />
                  <div>
                    <p className="sf-account-summary-label">Auth method</p>
                    <p className="sf-account-summary-value">{accountMeta?.providerLabel ?? "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleAvatarUpload}
        className="hidden"
      />

      {isProfileDirty && activeTab === "general" ? (
        <div className="sf-account-mobile-bar" role="region" aria-label="Unsaved profile changes">
          <span className="sf-account-mobile-bar-text">Unsaved changes</span>
          <ActionButton
            loading={savingProfile}
            loadingLabel="Saving..."
            label="Save"
            disabled={!isProfileDirty}
            onClick={() => void handleSaveProfile()}
            className="sf-account-mobile-bar-btn"
          />
        </div>
      ) : null}
    </div>
  )
}
