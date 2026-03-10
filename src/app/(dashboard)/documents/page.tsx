import dynamic from "next/dynamic";

const DocumentsPage = dynamic(() => import("@/modules/documents/DocumentsPage"));

export default function DocumentsRoutePage() {
  return <DocumentsPage />;
}