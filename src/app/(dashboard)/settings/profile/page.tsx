import dynamic from "next/dynamic"

const ProfilePage = dynamic(() => import("@/modules/settings/ProfilePage"), {
  loading: () => <div className="py-8 text-center">Loading...</div>
})

export default function SettingsProfileRoutePage() {
  return <ProfilePage />
}
