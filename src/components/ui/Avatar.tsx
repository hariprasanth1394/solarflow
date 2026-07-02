"use client"

import { useState } from "react"
import Image from "next/image"
import type { UserRole } from "@/lib/rbac/roles"

type AvatarProps = {
  src?: string | null
  alt?: string
  initials?: string
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
}

const sizePixels = {
  sm: 32,
  md: 36,
  lg: 56,
  xl: 80,
}

const AVATAR_GRADIENT = "linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)"

export default function Avatar({
  src,
  alt = "Avatar",
  initials = "?",
  size = "md",
  className = "",
}: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const sizeClass = sizeClasses[size]
  const pixelSize = sizePixels[size]
  const showImage = Boolean(src) && !imageFailed

  if (showImage && src) {
    const isBlob = src.startsWith("blob:")

    if (isBlob) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          width={pixelSize}
          height={pixelSize}
          className={`rounded-xl object-cover ${sizeClass} ${className}`}
          onError={() => setImageFailed(true)}
        />
      )
    }

    return (
      <Image
        src={src}
        alt={alt}
        width={pixelSize}
        height={pixelSize}
        className={`rounded-xl object-cover ${sizeClass} ${className}`}
        onError={() => setImageFailed(true)}
      />
    )
  }

  return (
    <div
      className={`flex items-center justify-center rounded-xl font-semibold text-white shadow-[0_8px_20px_-10px_rgba(124,58,237,0.65)] ${sizeClass} ${className}`}
      style={{ background: AVATAR_GRADIENT }}
      aria-label={alt}
    >
      {initials}
    </div>
  )
}

export function getRoleBadgeLabel(role: UserRole) {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin"
    case "ADMIN":
      return "Admin"
    case "MANAGER":
      return "Manager"
    case "TECHNICIAN":
      return "Technician"
    case "VIEWER":
      return "Viewer"
    default:
      return role
  }
}
