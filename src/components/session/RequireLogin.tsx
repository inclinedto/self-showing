"use client";

import { Button } from "@once-ui-system/core";
import { usePathname } from "next/navigation";
import { Loading, Notice } from "@/components/ui/Notice";
import { useSession } from "./SessionProvider";

export function loginHref(next: string | null, register = false) {
  const params = new URLSearchParams();
  if (register) params.set("mode", "register");
  if (next && next !== "/login") params.set("next", next);
  const query = params.toString();
  return `/login${query ? `?${query}` : ""}`;
}

export function LoginPrompt({ description }: { description?: string }) {
  const pathname = usePathname();
  return (
    <Notice icon="lock" title="登录后继续" description={description ?? "注册只需要用户名和密码，不需要手机号。"}>
      <Button href={loginHref(pathname)} variant="primary" size="m">
        登录
      </Button>
      <Button href={loginHref(pathname, true)} variant="secondary" size="m">
        注册新账号
      </Button>
    </Notice>
  );
}

export function ComingSoon() {
  return (
    <Notice
      icon="lock"
      title="账号与社区功能即将开放"
      description="站长正在配置数据库和会员系统，开放后就可以注册、发树洞和使用 AI 工具了。格式转换和二十多个小工具现在就能免费使用 🧰"
    >
      <Button href="/tools" variant="secondary" size="m" prefixIcon="grid">
        去工具箱逛逛
      </Button>
    </Notice>
  );
}

type Props = {
  children: React.ReactNode;
  description?: string;
  /** AI tools stay open to guests while both the database and the AI key are missing (demo mode). */
  allowDemoGuest?: boolean;
};

export function RequireLogin({ children, description, allowDemoGuest = false }: Props) {
  const { user, status, loading } = useSession();
  if (loading) return <Loading />;
  if (status && !status.db) {
    if (allowDemoGuest && !status.ai) return <>{children}</>;
    return <ComingSoon />;
  }
  if (!user) return <LoginPrompt description={description} />;
  return <>{children}</>;
}
