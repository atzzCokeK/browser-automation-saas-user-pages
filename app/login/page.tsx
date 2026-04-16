"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import styles from "@/styles/login.module.css";

export default function LoginPage() {
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    router.push("/dashboard");
  };

  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <div className={styles.logoArea}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="6" fill="#1e40af" />
            <path d="M7 8h10M7 12h10M7 16h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h1>SaaS Admin</h1>
          <p>管理画面にログイン</p>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="email">メールアドレス</label>
            <input
              id="email"
              type="email"
              placeholder="admin@example.com"
              defaultValue="admin@example.com"
              autoComplete="email"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              placeholder="パスワードを入力"
              defaultValue="password"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className={styles.submitButton}>
            ログイン
          </button>
        </form>
      </section>
    </main>
  );
}
