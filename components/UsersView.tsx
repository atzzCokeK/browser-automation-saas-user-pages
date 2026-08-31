"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
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
  const [searchInput, setSearchInput] = useState("");
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

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    setEmailQuery(searchInput.trim());
    setPage(1);
  };

  // 入力欄を空にしたのに絞り込みが残ると分かりにくいので、その場で解除する。
  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    if (value.trim() === "") {
      setEmailQuery("");
      setPage(1);
    }
  };

  const handleConfirmDelete = () => {
    if (userToDelete) {
      deleteUser(userToDelete.id);
      setNotification(`${userToDelete.name} を削除しました`);
    }
    setUserToDelete(null);
  };

  const handleCloseNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setUserToDelete(null);
  }, []);

  return (
    <section className={styles.page}>
      {notification && (
        <NotificationBar message={notification} onClose={handleCloseNotification} />
      )}

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

      <form className={styles.searchRow} role="search" onSubmit={handleSearchSubmit}>
        <input
          id="email-search"
          name="email-search"
          type="search"
          className={styles.searchInput}
          value={searchInput}
          onChange={(event) => handleSearchInputChange(event.target.value)}
          placeholder="メールアドレス検索"
          aria-label="メールアドレス検索"
          autoComplete="off"
        />
        <button type="submit" className={styles.searchButton}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          検索
        </button>
        {emailQuery !== "" && (
          <span className={styles.searchResult}>{visibleUsers.length} 件が該当</span>
        )}
      </form>

      <Suspense fallback={<div>Loading...</div>}>
        <ModeSwitcher />
      </Suspense>

      {visibleUsers.length === 0 ? (
        <p className={styles.empty}>
          {emailQuery === ""
            ? "表示できるユーザーがいません。"
            : `メールアドレスに「${emailQuery}」を含むユーザーは見つかりませんでした。`}
        </p>
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
