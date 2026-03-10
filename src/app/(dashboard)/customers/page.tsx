import dynamic from "next/dynamic";

const CustomersPage = dynamic(() => import("@/modules/customers/CustomersPage"));

export default function CustomersRoutePage() {
  return <CustomersPage />;
}