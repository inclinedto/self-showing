import Link from "next/link";
import { site } from "@/resources/site";
import { Logo } from "./Logo";
import styles from "./Footer.module.scss";

const GROUPS = [
  {
    title: "社区",
    links: [
      { href: "/treehole", label: "树洞" },
      { href: "/box", label: "提问箱" },
    ],
  },
  {
    title: "工具",
    links: [
      { href: "/tools/extract", label: "表格提取" },
      { href: "/tools/ask", label: "文档问答" },
      { href: "/tools/chat", label: "AI 小助手" },
      { href: "/tools/convert", label: "格式转换" },
    ],
  },
  {
    title: "关于",
    links: [
      { href: "/pricing", label: "会员" },
      { href: "/terms", label: "用户协议" },
      { href: "/privacy", label: "隐私政策" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <svg className={styles.wave} viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 24 C 200 4 400 40 600 22 S 1000 4 1200 24 V40 H0 Z" />
      </svg>
      <div className={styles.inner}>
        <div className={styles.about}>
          <Link href="/" className={styles.brand}>
            <Logo size={24} id="footer-logo" />
            <span>{site.name}</span>
          </Link>
          <p className={styles.quote} lang="en">
            {site.quote.text}
          </p>
          <p className={styles.tagline}>{site.tagline}</p>
          {site.contactEmail && (
            <a className={styles.contact} href={`mailto:${site.contactEmail}`}>
              {site.contactEmail}
            </a>
          )}
        </div>
        {GROUPS.map((group) => (
          <nav key={group.title} className={styles.group} aria-label={group.title}>
            <h2 className={styles.groupTitle}>{group.title}</h2>
            {group.links.map((link) => (
              <Link key={link.href} href={link.href} className={styles.link}>
                {link.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className={styles.bottom}>
        © {year} {site.name}
      </div>
    </footer>
  );
}
