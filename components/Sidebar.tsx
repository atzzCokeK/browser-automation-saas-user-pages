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
