import { cn } from "@/lib/utils"
import AppSpinner, { type AppSpinnerSize } from "./AppSpinner"

type SpinnerProps = {
  className?: string
  size?: AppSpinnerSize
}

export default function Spinner({ className, size = "md" }: SpinnerProps) {
  return <AppSpinner size={size} className={cn(className)} />
}
