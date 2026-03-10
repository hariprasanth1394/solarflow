import { cn } from "../../lib/utils"

type AlertVariant = "info" | "success" | "warning" | "danger"

const styles: Record<AlertVariant, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700"
}

export default function Alert({ title, message, variant = "info" }: { title: string; message: string; variant?: AlertVariant }) {
  return (
    <div className={cn("rounded-xl border px-4 py-3", styles[variant])}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-sm">{message}</p>
    </div>
  )
}
