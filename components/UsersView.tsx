"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { type User } from "@/data/users";
import { consumeNotification, deleteUser, useUserStore } from "@/hooks/useUserStore";
import ConfirmDialog from "@/components/ConfirmDialog";
import CsvDownloadButton from "@/components/CsvDownloadButton";
import InfiniteScrollUsers from "@/components/InfiniteScrollUsers";
import ModeSwitcher from "@/components/ModeSwitcher";
import NotificationBar from "@/components/NotificationBar";
import Pagination from "@/components/Pagination";
import UserTable from "@/components/UserTable";
import styles from "@/styles/users.module.css";

const PER_PAGE = 20;

type Props = {
  allUsers: User[];
  mode: "pagination" | "cumulative";
  initialPage: number;
};

export default function UsersView({ allUsers, mode, initialPage }: Props) {
  const { addedUsers, deletedIds } = useUserStore();
  const [emailQuery, setEmailQuery] = useState("");
  const [page, setPage] = useState(initialPage);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const message = consumeNotification();
    if (message !== null) setNotification(message);
  }, []);

  const visibleUsers = useMemo(() => {
    const query = emailQuery.trim().toLowerCase();
    return [...addedUsers, ...allUsers].filter(
      (user) =>
        !deletedIds.has(user.id) &&
        (query === "" || user.email.toLowerCase().includes(query))
    );
  }, [addedUsers, allUsers, deletedIds, emailQuery]);

  const totalPages = Math.max(1, Math.ceil(visibleUsers.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PER_PAGE;
  const pageUsers = visibleUsers.slice(start, start + PER_PAGE);

  const handleQueryChange = (value: string) => {
    setEmailQuery(value);
    setPage(1);
  };

  const handleConfirmDelete = () => {
    if (userToDelete) {
      deleteUser(userToDelete.id);
    }
    setUserToDelete(null);
  };

  const handleCancelDelete = useCallback(() => {
    setUserToDelete(null);
  }, []);

  return (
    <section className={styles.page}>
      {notification && <NotificationBar message={notification} />}

      <div className={styles.titleRow}>
        <h1 className={styles.title}>ユーザー一覧</h1>
        <div className={styles.titleActions}>
          <Link href="/users/new" className={styles.newButton}>
            新規登録
          </Link>
          <CsvDownloadButton users={visibleUsers} />
          <span className={styles.count}>全 {visibleUsers.length} 件</span>
        </div>
      </div>

      <div className={styles.searchRow}>
        <label htmlFor="email-search" className={styles.searchLabel}>
          メールアドレス検索
        </label>
        <input
          id="email-search"
          name="email-search"
          type="search"
          className={styles.searchInput}
          value={emailQuery}
          onChange={(event) => handleQueryChange(event.target.value)}
          placeholder="例: tanaka@example.co.jp"
          autoComplete="off"
        />
        {emailQuery.trim() !== "" && (
          <span className={styles.searchResult}>{visibleUsers.length} 件が該当</span>
        )}
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <ModeSwitcher />
      </Suspense>

      {visibleUsers.length === 0 ? (
        <p className={styles.empty}>該当するユーザーが見つかりませんでした。</p>
      ) : mode === "pagination" ? (
        <>
          <UserTable users={pageUsers} onDelete={setUserToDelete} />

          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setPage}
          />

          <footer className={styles.rangeFooter}>
            {start + 1}〜{start + pageUsers.length} 件を表示 / 全 {visibleUsers.length} 件
          </footer>
        </>
      ) : (
        <InfiniteScrollUsers users={visibleUsers} onDelete={setUserToDelete} />
      )}

      <ConfirmDialog
        open={userToDelete !== null}
        title="ユーザーを削除しますか？"
        message={
          userToDelete
            ? `${userToDelete.name}（${userToDelete.email}）を削除します。この操作は取り消せません。`
            : ""
        }
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </section>
  );
}
