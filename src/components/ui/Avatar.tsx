type AvatarProps = {
  name: string
  src?: string
}

export default function Avatar({ name, src }: AvatarProps) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} className="h-9 w-9 rounded-full object-cover" />
  ) : (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-300 text-xs font-semibold text-slate-700">
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}
