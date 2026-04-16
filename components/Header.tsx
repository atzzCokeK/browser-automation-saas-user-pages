"use client";

import { useRouter } from "next/navigation";
import styles from "@/styles/header.module.css";

export default function Header() {
  const router = useRouter();

  const handleLogout = () => {
    router.push("/login");
  };

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="6" fill="#1e40af" />
          <path d="M7 8h10M7 12h10M7 16h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>SaaS Admin</span>
      </div>
      <div className={styles.userArea}>
        <span className={styles.userName}>管理者</span>
        <button onClick={handleLogout} className={styles.logoutButton}>
          ログアウト
        </button>
      </div>
    </header>
  );
}
