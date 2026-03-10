import dynamic from "next/dynamic";

const CustomerDetailsPage = dynamic(() => import("@/modules/customers/CustomerDetailsPage"));

export default function CustomerDetailRoutePage() {
  return <CustomerDetailsPage />;
}