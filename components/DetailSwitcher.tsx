import { useNavigate, useSearchParams } from "react-router";
import styles from "@/styles/mode-switcher.module.css";

export type Detail = "all" | "expand";

const details: { value: Detail; label: string }[] = [
  { value: "all", label: "全項目を表示" },
  { value: "expand", label: "行内で詳細表示" },
];

export function parseDetail(searchParams: URLSearchParams): Detail {
  return searchParams.get("detail") === "expand" ? "expand" : "all";
}

export default function DetailSwitcher() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentDetail = parseDetail(searchParams);

  const handleDetailChange = (detail: Detail) => {
    const params = new URLSearchParams(searchParams);
    if (detail === "expand") {
      params.set("detail", "expand");
    } else {
      params.delete("detail");
    }

    navigate(`/users?${params.toString()}`);
  };

  return (
    <div className={styles.group} role="group" aria-labelledby="detail-switcher-label">
      <span id="detail-switcher-label" className={styles.groupLabel}>
        項目の表示
      </span>
      <div className={styles.wrapper}>
        {details.map(({ value, label }) => (
          <button
            key={value}
            className={`${styles.tab} ${currentDetail === value ? styles.tabActive : ""}`}
            onClick={() => handleDetailChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
