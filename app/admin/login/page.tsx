import { Suspense } from "react"
import { AdminLoginForm } from "./login-form"

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-6 text-muted-foreground text-sm">
          読み込み中…
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  )
}
