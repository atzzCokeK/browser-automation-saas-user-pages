"use client";

import { useState, useRef, useCallback } from "react";
import { type User } from "@/data/users";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import UserTable from "@/components/UserTable";
import styles from "@/styles/infinite-scroll.module.css";

type Props = {
  initialUsers: User[];
  totalCount: number;
};

const PER_PAGE = 20;

export default function InfiniteScrollUsers({ initialUsers, totalCount }: Props) {
  const [items, setItems] = useState<User[]>(initialUsers);
  const [page, setPage] = useState(2); // Next page to fetch
  const [isLoadingDown, setIsLoadingDown] = useState(false);
  const [hasMore, setHasMore] = useState(initialUsers.length < totalCount);

  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  const fetchUsers = async (pageNum: number) => {
    try {
      const response = await fetch(`/api/users?page=${pageNum}&limit=${PER_PAGE}`);
      if (!response.ok) throw new Error("Failed to fetch");
      return await response.json();
    } catch (error) {
      console.error("Error fetching users:", error);
      return null;
    }
  };

  const handleLoadDown = useCallback(async () => {
    if (isLoadingRef.current || !hasMore) {
      return;
    }

    isLoadingRef.current = true;
    setIsLoadingDown(true);
    const data = await fetchUsers(page);

    if (data) {
      setItems((prev) => [...prev, ...data.users]);
      setPage((p) => p + 1);
      setHasMore(data.hasMore);
    }
    setIsLoadingDown(false);
    isLoadingRef.current = false;
  }, [hasMore, page]);

  useIntersectionObserver(bottomSentinelRef, handleLoadDown, {
    threshold: 0,
    rootMargin: "200px",
    enabled: !isLoadingDown && hasMore,
  });

  return (
    <div className={styles.scrollContainer}>
      <UserTable users={items} />

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
        1〜{items.length} 件を表示 / 全 {totalCount} 件
      </div>
    </div>
  );
}
