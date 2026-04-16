import Link from "next/link";
import styles from "@/styles/pagination.module.css";

type Props = {
  currentPage: number;
  totalPages: number;
  basePath: string;
};

export default function Pagination({ currentPage, totalPages, basePath }: Props) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav className={styles.pagination} aria-label="ページネーション">
      <Link
        href={`${basePath}?page=${currentPage - 1}`}
        className={`${styles.pageLink} ${currentPage <= 1 ? styles.disabled : ""}`}
        aria-disabled={currentPage <= 1}
        tabIndex={currentPage <= 1 ? -1 : undefined}
      >
        前へ
      </Link>
      {pages.map((page) => (
        <Link
          key={page}
          href={`${basePath}?page=${page}`}
          className={`${styles.pageLink} ${page === currentPage ? styles.active : ""}`}
          aria-current={page === currentPage ? "page" : undefined}
        >
          {page}
        </Link>
      ))}
      <Link
        href={`${basePath}?page=${currentPage + 1}`}
        className={`${styles.pageLink} ${currentPage >= totalPages ? styles.disabled : ""}`}
        aria-disabled={currentPage >= totalPages}
        tabIndex={currentPage >= totalPages ? -1 : undefined}
      >
        次へ
      </Link>
    </nav>
  );
}
