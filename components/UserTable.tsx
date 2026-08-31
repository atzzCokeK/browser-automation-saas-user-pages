import { type User } from "@/data/users";
import styles from "@/styles/users.module.css";

type Props = {
  users: User[];
  onDelete: (user: User) => void;
};

export default function UserTable({ users, onDelete }: Props) {
  return (
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
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={`${user.id}-${index}`}>
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
              <td>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => onDelete(user)}
                  aria-label={`${user.name} を削除`}
                >
                  削除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
