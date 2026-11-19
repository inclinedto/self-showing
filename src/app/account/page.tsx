import { RequireLogin } from "@/components/session/RequireLogin";
import { pageMetadata } from "@/lib/metadata";
import { AccountView } from "./AccountView";

export const metadata = pageMetadata({
  title: "我的账户",
  description: "会员状态、今日额度、订单和我发布的内容。",
  path: "/account",
  noIndex: true,
});

export default function AccountPage() {
  return (
    <RequireLogin description="登录后查看会员、额度和你发布的内容。">
      <AccountView />
    </RequireLogin>
  );
}
