import type { HTMLAttributes, ReactNode } from "react"

type CardVariant = "section" | "surface" | "mobile"

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  variant?: CardVariant
  padded?: boolean
}

const variantClassMap: Record<CardVariant, string> = {
  section: "sf-section-card",
  surface: "sf-surface-card",
  mobile: "sf-mobile-list-card",
}

export default function Card({ children, className, variant = "section", padded = false, ...props }: CardProps) {
  const classes = [variantClassMap[variant], padded ? "p-5" : "", className ?? ""].filter(Boolean).join(" ")

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}