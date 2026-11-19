import Link from "next/link";
import { site } from "@/resources/site";
import { Logo } from "./Logo";
import styles from "./Footer.module.scss";

const GROUPS = [
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
    title: "社区",
    links: [
      { href: "/treehole", label: "树洞" },
      { href: "/box", label: "提问箱" },
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
      <div className={styles.inner}>
        <div className={styles.about}>
          <Link href="/" className={styles.brand}>
            <Logo size={24} />
            <span>{site.name}</span>
          </Link>
          <p className={styles.tagline}>好用的 AI 小工具，和一个可以说心里话的地方。</p>
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
