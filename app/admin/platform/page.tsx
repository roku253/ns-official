import { redirect } from "next/navigation"

/** 旧 URL。作品CMS へ統合 */
export default function AdminPlatformRedirectPage() {
  redirect("/admin/works")
}
