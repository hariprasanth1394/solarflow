import Image from "next/image"

type AvatarProps = {
  src?: string | null
  alt?: string
  initials?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-14 w-14 text-base"
}

export default function Avatar({
  src,
  alt = "Avatar",
  initials = "?",
  size = "md",
  className = ""
}: AvatarProps) {
  const sizeClass = sizeClasses[size]

  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={size === "lg" ? 56 : size === "sm" ? 32 : 36}
        height={size === "lg" ? 56 : size === "sm" ? 32 : 36}
        className={`rounded-xl object-cover ${sizeClass} ${className}`}
      />
    )
  }

  return (
    <div
      className={`flex items-center justify-center rounded-xl font-semibold text-white ${sizeClass} ${className}`}
      style={{
        background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)"
      }}
    >
      {initials}
    </div>
  )
}
