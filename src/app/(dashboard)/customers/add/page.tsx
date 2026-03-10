import dynamic from "next/dynamic"

const CustomerWizard = dynamic(() => import("@/modules/customers/wizard/CustomerWizard"))

export default function AddCustomerPage() {
  return <CustomerWizard />
}
