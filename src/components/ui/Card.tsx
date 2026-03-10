type CardProps = {
  children: React.ReactNode
  className?: string
}

export default function Card({ children, className = "" }: CardProps) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6 ${className}`}>{children}</div>
}