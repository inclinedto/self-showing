import { Suspense } from "react";
import { Loading } from "@/components/ui/Notice";
import { pageMetadata } from "@/lib/metadata";
import { LoginForm } from "./LoginForm";

export const metadata = pageMetadata({
  title: "登录 / 注册",
  description: "登录或注册账号，只需要用户名和密码。",
  path: "/login",
  noIndex: true,
});

export default function LoginPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LoginForm />
    </Suspense>
  );
}
