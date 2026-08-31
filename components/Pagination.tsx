"use client";

import styles from "@/styles/pagination.module.css";

type Props = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function Pagination({ currentPage, totalPages, onPageChange }: Props) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav className={styles.pagination} aria-label="ページネーション">
      <button
        type="button"
        className={`${styles.pageLink} ${currentPage <= 1 ? styles.disabled : ""}`}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        前へ
      </button>
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          className={`${styles.pageLink} ${page === currentPage ? styles.active : ""}`}
          onClick={() => onPageChange(page)}
          aria-current={page === currentPage ? "page" : undefined}
        >
          {page}
        </button>
      ))}
      <button
        type="button"
        className={`${styles.pageLink} ${currentPage >= totalPages ? styles.disabled : ""}`}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        次へ
      </button>
    </nav>
  );
}
