type PasswordStrengthMeterProps = {
  password: string
}

function getStrength(password: string) {
  if (!password) {
    return { score: 0, label: "Enter a password", tone: "muted" as const }
  }

  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (score <= 2) return { score: 1, label: "Weak", tone: "weak" as const }
  if (score <= 3) return { score: 2, label: "Fair", tone: "fair" as const }
  if (score <= 4) return { score: 3, label: "Good", tone: "good" as const }
  return { score: 4, label: "Strong", tone: "strong" as const }
}

const toneClassMap = {
  muted: "bg-[var(--border)]",
  weak: "bg-rose-500",
  fair: "bg-amber-500",
  good: "bg-sky-500",
  strong: "bg-emerald-500",
}

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = getStrength(password)
  const activeBars = password ? strength.score : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
              index < activeBars ? toneClassMap[strength.tone] : "bg-[var(--border)]"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-[var(--muted)]">
        Password strength: <span className="font-medium text-[var(--text)]">{strength.label}</span>
      </p>
    </div>
  )
}

export function getPasswordValidationErrors(password: string, confirmPassword: string) {
  const errors: string[] = []
  if (password.length < 8) errors.push("New password must be at least 8 characters.")
  if (password && confirmPassword && password !== confirmPassword) errors.push("Passwords do not match.")
  return errors
}
