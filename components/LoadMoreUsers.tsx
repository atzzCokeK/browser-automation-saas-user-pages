import { useState } from "react";
import { type User } from "@/data/users";
import UserTable from "@/components/UserTable";
import styles from "@/styles/infinite-scroll.module.css";

type Props = {
  users: User[];
  onDelete: (user: User) => void;
};

const PER_PAGE = 20;
const LOAD_DELAY_MS = 300;

export default function LoadMoreUsers({ users, onDelete }: Props) {
  const [visibleCount, setVisibleCount] = useState(PER_PAGE);
  const [isLoading, setIsLoading] = useState(false);

  const items = users.slice(0, visibleCount);
  const hasMore = visibleCount < users.length;

  const handleLoadMore = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, LOAD_DELAY_MS));

    setVisibleCount((count) => count + PER_PAGE);
    setIsLoading(false);
  };

  return (
    <div className={styles.scrollContainer}>
      <UserTable users={items} onDelete={onDelete} />

      {hasMore ? (
        <div className={styles.loadMoreRow}>
          <button
            type="button"
            className={styles.loadMoreButton}
            onClick={handleLoadMore}
            disabled={isLoading}
          >
            {isLoading ? "読み込み中..." : "もっと読み込む"}
          </button>
        </div>
      ) : (
        <div className={styles.allLoaded}>すべて読み込みました</div>
      )}

      <div className={styles.positionIndicator}>
        1〜{items.length} 件を表示 / 全 {users.length} 件
      </div>
    </div>
  );
}
