const AVATAR_MAX_BYTES = 5 * 1024 * 1024
const AVATAR_ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

export function getInitials(name: string, fallback = "?") {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase()
}

export function validateAvatarFile(file: File) {
  if (!AVATAR_ACCEPTED_TYPES.has(file.type)) {
    throw new Error("Please upload a JPG, PNG, or WEBP image.")
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error("Image must be 5MB or smaller.")
  }
}

export function withAvatarCacheBust(url: string | null | undefined, version?: string | number | null) {
  if (!url) return null
  if (url.startsWith("blob:")) return url
  const separator = url.includes("?") ? "&" : "?"
  return version ? `${url}${separator}v=${version}` : url
}

export async function cropImageToSquare(file: File, size = 256): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(objectUrl)
    const side = Math.min(image.width, image.height)
    const sx = (image.width - side) / 2
    const sy = (image.height - side) / 2

    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size

    const context = canvas.getContext("2d")
    if (!context) {
      throw new Error("Unable to process image.")
    }

    context.drawImage(image, sx, sy, side, side, 0, 0, size, size)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.9)
    })

    if (!blob) {
      throw new Error("Unable to process image.")
    }

    return blob
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Unable to read image file."))
    image.src = src
  })
}
