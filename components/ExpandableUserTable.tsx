import { Fragment, useState } from "react";
import { permissionLabel, type User } from "@/data/users";
import { type UserTableProps } from "@/components/UserTable";
import styles from "@/styles/users.module.css";

const COLUMN_COUNT = 4;

export default function ExpandableUserTable({ users, onDelete }: UserTableProps) {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<number>>(new Set());

  const toggleExpanded = (id: number) => {
    setExpandedIds((ids) => {
      const next = new Set(ids);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>ユーザー名</th>
            <th>ステータス</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => {
            const isExpanded = expandedIds.has(user.id);
            const detailId = `user-detail-${user.id}`;

            return (
              <Fragment key={`${user.id}-${index}`}>
                <tr className={isExpanded ? styles.rowExpanded : ""}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        user.status === "有効" ? styles.statusActive : styles.statusInactive
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.detailLink}
                        onClick={() => toggleExpanded(user.id)}
                        aria-expanded={isExpanded}
                        aria-controls={isExpanded ? detailId : undefined}
                        aria-label={`${user.name} の詳細を${isExpanded ? "閉じる" : "表示"}`}
                      >
                        {isExpanded ? "閉じる" : "詳細"}
                        <svg
                          className={`${styles.toggleIcon} ${isExpanded ? styles.toggleIconOpen : ""}`}
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => onDelete(user)}
                        aria-label={`${user.name} を削除`}
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr id={detailId} className={styles.detailRow}>
                    <td colSpan={COLUMN_COUNT}>
                      <UserDetailList user={user} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UserDetailList({ user }: { user: User }) {
  const items = [
    { label: "メールアドレス", value: user.email, isWide: false },
    { label: "部署", value: user.department, isWide: false },
    { label: "役職", value: user.position, isWide: false },
    { label: "権限", value: permissionLabel(user.permission), isWide: false },
    { label: "入社日", value: user.joinDate, isWide: false },
    { label: "作成日", value: user.createdAt, isWide: false },
    { label: "備考", value: user.notes, isWide: true },
  ];

  return (
    <div className={styles.detailPanel}>
      <dl className={styles.detailList}>
        {items.map(({ label, value, isWide }) => (
          <div
            key={label}
            className={`${styles.detailField} ${isWide ? styles.detailFieldWide : ""}`}
          >
            <dt>{label}</dt>
            <dd className={value === "" ? styles.detailEmpty : ""}>
              {value === "" ? "未設定" : value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
