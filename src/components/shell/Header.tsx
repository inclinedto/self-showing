"use client";

import classNames from "classnames";
import { Icon } from "@once-ui-system/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { nav, site } from "@/resources/site";
import { AccountMenu } from "./AccountMenu";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./Header.module.scss";

export function Header() {
  const pathname = usePathname() ?? "/";

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label={`${site.name} 首页`}>
          <Logo />
          <span>{site.name}</span>
        </Link>
        <nav className={styles.nav} aria-label="主导航">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={classNames(styles.link, active && styles.active)}
                aria-current={active ? "page" : undefined}
              >
                <Icon name={item.icon} size="xs" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className={styles.actions}>
          <ThemeToggle />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
