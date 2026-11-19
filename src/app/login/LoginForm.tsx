"use client";

import {
  Button,
  Checkbox,
  Column,
  Feedback,
  Heading,
  Input,
  PasswordInput,
  SegmentedControl,
  SmartLink,
  Text,
} from "@once-ui-system/core";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ComingSoon } from "@/components/session/RequireLogin";
import { useSession } from "@/components/session/SessionProvider";
import { Loading } from "@/components/ui/Notice";
import { api, errorMessage } from "@/lib/api";
import type { SessionUser } from "@/lib/types";

type Mode = "login" | "register";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/login")) {
    return "/account";
  }
  return value;
}

export function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, status, loading, setUser, refresh } = useSession();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "register" ? "register" : "login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const next = safeNext(params.get("next"));

  if (loading) return <Loading />;
  if (status && !status.db) return <ComingSoon />;

  if (user) {
    return (
      <Column maxWidth={24} fillWidth gap="16" paddingY="48" style={{ margin: "0 auto" }}>
        <Heading as="h1" variant="heading-strong-l">
          你已登录
        </Heading>
        <Text onBackground="neutral-weak">当前账号：{user.username}</Text>
        <Button href={next} variant="primary" fillWidth>
          继续
        </Button>
      </Column>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    if (mode === "register") {
      if (password !== confirm) return setError("两次输入的密码不一致。");
      if (!agree) return setError("请先阅读并同意用户协议和隐私政策。");
    }
    setSubmitting(true);
    try {
      const data = await api<{ user: SessionUser }>(`/api/auth/${mode}`, {
        body: { username, password, inviteCode, agree },
      });
      setUser(data.user);
      await refresh();
      router.replace(next);
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Column maxWidth={24} fillWidth gap="24" paddingY="32" style={{ margin: "0 auto" }}>
      <Column gap="8">
        <Heading as="h1" variant="heading-strong-xl">
          {mode === "login" ? "欢迎回来" : "创建账号"}
        </Heading>
        <Text onBackground="neutral-weak" variant="body-default-s">
          {mode === "login"
            ? "登录后可以使用 AI 工具、发树洞和向站长提问。"
            : "只需要用户名和密码，不需要手机号和邮箱。用户名不会在树洞里公开。"}
        </Text>
      </Column>

      <SegmentedControl
        selected={mode}
        onToggle={(value) => {
          setMode(value as Mode);
          setError(undefined);
        }}
        buttons={[
          { value: "login", label: "登录" },
          { value: "register", label: "注册" },
        ]}
      />

      <form onSubmit={submit} noValidate>
        <Column gap="16">
          <Input
            id="username"
            label="用户名"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            description={mode === "register" ? "2–20 位中文、字母、数字或下划线" : undefined}
            required
          />
          <PasswordInput
            id="password"
            label="密码"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            description={mode === "register" ? "至少 8 位" : undefined}
            required
          />
          {mode === "register" && (
            <>
              <PasswordInput
                id="confirm-password"
                label="确认密码"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
              />
              {status?.inviteRequired && (
                <Input
                  id="invite-code"
                  label="邀请码"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                  description="内测期间注册需要邀请码"
                  required
                />
              )}
              <Checkbox
                isChecked={agree}
                onToggle={() => setAgree((value) => !value)}
                label={
                  <Text variant="body-default-s">
                    我已阅读并同意 <SmartLink href="/terms">用户协议</SmartLink> 和{" "}
                    <SmartLink href="/privacy">隐私政策</SmartLink>
                  </Text>
                }
              />
            </>
          )}
          {error && <Feedback variant="danger" description={error} />}
          <Button type="submit" variant="primary" size="l" fillWidth loading={submitting}>
            {mode === "login" ? "登录" : "注册并登录"}
          </Button>
          {mode === "login" && (
            <Text variant="body-default-xs" onBackground="neutral-weak" align="center">
              忘记密码？请联系站长帮你重置。
            </Text>
          )}
        </Column>
      </form>
    </Column>
  );
}
