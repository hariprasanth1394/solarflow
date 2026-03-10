import dynamic from "next/dynamic";

const SettingsPage = dynamic(() => import("@/modules/settings/SettingsPage"));

export default function SettingsRoutePage() {
  return <SettingsPage />;
}