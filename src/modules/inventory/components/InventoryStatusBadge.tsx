import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react"

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock"

type InventoryStatusBadgeProps = {
  status: StockStatus
}

const meta: Record<StockStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  in_stock: {
    label: "In Stock",
    className: "inv-stock-badge--in",
    Icon: CheckCircle2,
  },
  low_stock: {
    label: "Low Stock",
    className: "inv-stock-badge--low",
    Icon: AlertTriangle,
  },
  out_of_stock: {
    label: "Out of Stock",
    className: "inv-stock-badge--out",
    Icon: XCircle,
  },
}

export function getStockStatus(stock: number, required: number, minStock = 0): StockStatus {
  if (stock <= 0 || stock < required) return "out_of_stock"
  if (stock <= minStock || stock < required * 2) return "low_stock"
  return "in_stock"
}

export default function InventoryStatusBadge({ status }: InventoryStatusBadgeProps) {
  const { label, className, Icon } = meta[status]
  return (
    <span className={`inv-stock-badge ${className}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}
