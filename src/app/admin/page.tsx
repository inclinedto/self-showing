import { RequireLogin } from "@/components/session/RequireLogin";
import { pageMetadata } from "@/lib/metadata";
import { AdminView } from "./AdminView";

export const metadata = pageMetadata({
  title: "管理后台",
  description: "站点管理",
  path: "/admin",
  noIndex: true,
});

export default function AdminPage() {
  return (
    <RequireLogin>
      <AdminView />
    </RequireLogin>
  );
}
