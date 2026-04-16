import Link from "next/link";
import { users } from "@/data/users";
import styles from "@/styles/dashboard.module.css";

export default function DashboardPage() {
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "有効").length;
  const inactiveUsers = users.filter((u) => u.status === "無効").length;
  const recentUsers = users
    .filter((u) => u.createdAt >= "2025-01")
    .length;

  const activities = [
    { text: "田中 太郎 さんのアカウントが作成されました", time: "2時間前" },
    { text: "佐藤 花子 さんのステータスが有効に変更されました", time: "5時間前" },
    { text: "鈴木 健太 さんの部署が開発部に変更されました", time: "昨日" },
    { text: "高橋 美咲 さんのアカウントが無効化されました", time: "2日前" },
    { text: "渡辺 大輔 さんが新規登録されました", time: "3日前" },
  ];

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>ダッシュボード</h1>

      <div className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>総ユーザー数</p>
          <p className={styles.kpiValue}>{totalUsers}</p>
          <p className={styles.kpiSub}>
            <Link href="/users">一覧を見る →</Link>
          </p>
        </article>
        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>有効ユーザー</p>
          <p className={styles.kpiValue}>{activeUsers}</p>
          <p className={styles.kpiSub}>全体の{Math.round((activeUsers / totalUsers) * 100)}%</p>
        </article>
        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>無効ユーザー</p>
          <p className={styles.kpiValue}>{inactiveUsers}</p>
          <p className={styles.kpiSub}>全体の{Math.round((inactiveUsers / totalUsers) * 100)}%</p>
        </article>
        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>2025年の新規登録</p>
          <p className={styles.kpiValue}>{recentUsers}</p>
          <p className={styles.kpiSub}>件</p>
        </article>
      </div>

      <section className={styles.recentSection}>
        <h2 className={styles.recentTitle}>最近のアクティビティ</h2>
        <ul className={styles.activityList}>
          {activities.map((activity, i) => (
            <li key={i} className={styles.activityItem}>
              <span className={styles.activityDot} />
              <span>{activity.text}</span>
              <span className={styles.activityTime}>{activity.time}</span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
