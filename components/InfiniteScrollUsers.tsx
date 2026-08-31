"use client";

import { useState, useRef, useCallback } from "react";
import { type User } from "@/data/users";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import UserTable from "@/components/UserTable";
import styles from "@/styles/infinite-scroll.module.css";

type Props = {
  users: User[];
  onDelete: (user: User) => void;
};

const PER_PAGE = 20;
// 読み込み中インジケーターが見えるように、あえて待ってから続きを表示する。
const LOAD_DELAY_MS = 300;

export default function InfiniteScrollUsers({ users, onDelete }: Props) {
  const [visibleCount, setVisibleCount] = useState(PER_PAGE);
  const [isLoadingDown, setIsLoadingDown] = useState(false);

  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  const items = users.slice(0, visibleCount);
  const hasMore = visibleCount < users.length;

  const handleLoadDown = useCallback(async () => {
    if (isLoadingRef.current || !hasMore) {
      return;
    }

    isLoadingRef.current = true;
    setIsLoadingDown(true);
    await new Promise((resolve) => setTimeout(resolve, LOAD_DELAY_MS));

    setVisibleCount((count) => count + PER_PAGE);
    setIsLoadingDown(false);
    isLoadingRef.current = false;
  }, [hasMore]);

  useIntersectionObserver(bottomSentinelRef, handleLoadDown, {
    threshold: 0,
    rootMargin: "200px",
    enabled: !isLoadingDown && hasMore,
  });

  return (
    <div className={styles.scrollContainer}>
      <UserTable users={items} onDelete={onDelete} />

      {hasMore ? (
        <>
          <div ref={bottomSentinelRef} className={styles.sentinel} />
          {isLoadingDown && (
            <div className={styles.loadingIndicator}>読み込み中...</div>
          )}
        </>
      ) : (
        <div className={styles.allLoaded}>すべて読み込みました</div>
      )}

      <div className={styles.positionIndicator}>
        1〜{items.length} 件を表示 / 全 {users.length} 件
      </div>
    </div>
  );
}
