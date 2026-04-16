import { users } from "@/data/users";
import Pagination from "@/components/Pagination";
import styles from "@/styles/users.module.css";

const PER_PAGE = 20;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const totalPages = Math.ceil(users.length / PER_PAGE);
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PER_PAGE;
  const pageUsers = users.slice(start, start + PER_PAGE);

  return (
    <section className={styles.page}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>ユーザー一覧</h1>
        <span className={styles.count}>全 {users.length} 件</span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>ユーザー名</th>
              <th>メールアドレス</th>
              <th>部署</th>
              <th>ステータス</th>
              <th>作成日</th>
            </tr>
          </thead>
          <tbody>
            {pageUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.department}</td>
                <td>
                  <span
                    className={`${styles.statusBadge} ${
                      user.status === "有効" ? styles.statusActive : styles.statusInactive
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td>{user.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={safePage} totalPages={totalPages} basePath="/users" />

      <footer style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
        {start + 1}〜{Math.min(start + PER_PAGE, users.length)} 件を表示 / 全 {users.length} 件
      </footer>
    </section>
  );
}
