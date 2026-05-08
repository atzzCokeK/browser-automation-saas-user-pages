import { Suspense } from "react";
import { users } from "@/data/users";
import Pagination from "@/components/Pagination";
import UserTable from "@/components/UserTable";
import ModeSwitcher from "@/components/ModeSwitcher";
import InfiniteScrollUsers from "@/components/InfiniteScrollUsers";
import styles from "@/styles/users.module.css";

const PER_PAGE = 20;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; mode?: string }>;
}) {
  const { page, mode } = await searchParams;
  const displayMode = (mode as "pagination" | "cumulative") || "pagination";
  const currentPage = Math.max(1, Number(page) || 1);
  const totalPages = Math.ceil(users.length / PER_PAGE);
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PER_PAGE;
  const pageUsers = users.slice(start, start + PER_PAGE);

  const initialUsers = users.slice(0, PER_PAGE);

  return (
    <section className={styles.page}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>ユーザー一覧</h1>
        <span className={styles.count}>全 {users.length} 件</span>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <ModeSwitcher />
      </Suspense>

      {displayMode === "pagination" ? (
        <>
          <UserTable users={pageUsers} />

          <Pagination currentPage={safePage} totalPages={totalPages} basePath="/users" />

          <footer style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
            {start + 1}〜{Math.min(start + PER_PAGE, users.length)} 件を表示 / 全 {users.length} 件
          </footer>
        </>
      ) : (
        <InfiniteScrollUsers
          initialUsers={initialUsers}
          totalCount={users.length}
        />
      )}
    </section>
  );
}
