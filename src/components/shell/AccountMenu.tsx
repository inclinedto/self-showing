"use client";

import { Button, Icon, Spinner, Tag, Text } from "@once-ui-system/core";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/components/session/SessionProvider";
import styles from "./Header.module.scss";

export function AccountMenu() {
  const { user, loading, logout } = useSession();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: close the menu whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (loading) return <Spinner size="s" />;

  if (!user) {
    const next = pathname && pathname !== "/login" ? `?next=${encodeURIComponent(pathname)}` : "";
    return (
      <Button href={`/login${next}`} size="s" variant="primary" prefixIcon="user">
        登录
      </Button>
    );
  }

  return (
    <div className={styles.menuRoot} ref={ref}>
      <button
        type="button"
        className={styles.menuButton}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.avatar} aria-hidden="true">
          {user.username.slice(0, 1).toUpperCase()}
        </span>
        <span className={styles.menuName}>{user.username}</span>
        <Icon name="chevronDown" size="xs" onBackground="neutral-weak" />
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <div className={styles.menuHeader}>
            <Text variant="label-strong-s">{user.username}</Text>
            {user.isMember ? (
              <Tag size="s" variant="brand" prefixIcon="crown">
                会员
              </Tag>
            ) : (
              <Tag size="s" variant="neutral">
                免费版
              </Tag>
            )}
          </div>
          <Link role="menuitem" className={styles.menuItem} href="/account">
            <Icon name="user" size="s" /> 我的账户
          </Link>
          <Link role="menuitem" className={styles.menuItem} href="/account#posts">
            <Icon name="tree" size="s" /> 我的树洞
          </Link>
          <Link role="menuitem" className={styles.menuItem} href="/account#questions">
            <Icon name="inbox" size="s" /> 我的提问
          </Link>
          {!user.isMember && (
            <Link role="menuitem" className={styles.menuItem} href="/pricing">
              <Icon name="crown" size="s" /> 开通会员
            </Link>
          )}
          {user.isAdmin && (
            <Link role="menuitem" className={styles.menuItem} href="/admin">
              <Icon name="settings" size="s" /> 管理后台
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            className={styles.menuItem}
            onClick={async () => {
              setOpen(false);
              await logout();
              router.push("/");
            }}
          >
            <Icon name="logout" size="s" /> 退出登录
          </button>
        </div>
      )}
    </div>
  );
}
