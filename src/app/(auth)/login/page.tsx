import { Suspense } from "react"
import LoginPage from "@/modules/login/LoginPage"

export default function LoginRoutePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100" />}>
      <LoginPage />
    </Suspense>
  )
}
