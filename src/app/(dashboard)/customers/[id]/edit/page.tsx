import dynamic from "next/dynamic"

const CustomerEditPage = dynamic(() => import("@/modules/customers/CustomerEditPage"))

export default function CustomerEditRoutePage() {
  return <CustomerEditPage />
}
