import { Link, useLocation } from "react-router";
import styles from "@/styles/sidebar.module.css";

const navItems = [
  {
    href: "/dashboard",
    label: "ダッシュボード",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm9 0a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm9 0a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3z" />
      </svg>
    ),
  },
  {
    href: "/users",
    label: "ユーザー管理",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zm8 0a3 3 0 11-6 0 3 3 0 016 0zm-4.07 11c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
      </svg>
    ),
  },
  {
    href: "/audit-logs",
    label: "監査ログ",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: "/settings/scim",
    label: "SCIMプロビジョニング",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M10 2a4 4 0 00-4 4v1H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm-2 5V6a2 2 0 114 0v1H8zm2 3a1.5 1.5 0 00-.75 2.8V15h1.5v-2.2A1.5 1.5 0 0010 10z" />
      </svg>
    ),
  },
];

function isNavActive(pathname: string, href: string) {
  if (href === "/users") {
    return pathname === "/users" || pathname.startsWith("/users/");
  }
  return pathname === href;
}

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <nav className={styles.sidebar} aria-label="メインナビゲーション">
      <ul className={styles.navList}>
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              to={item.href}
              className={`${styles.navLink} ${isNavActive(pathname, item.href) ? styles.active : ""}`}
              aria-current={isNavActive(pathname, item.href) ? "page" : undefined}
              aria-label={item.label}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
