"use client";

import { useRouter, useSearchParams } from "next/navigation";
import styles from "@/styles/mode-switcher.module.css";

type Mode = "pagination" | "cumulative";

const modes: { value: Mode; label: string }[] = [
  { value: "pagination", label: "ページ送り" },
  { value: "cumulative", label: "累積スクロール" },
];

export default function ModeSwitcher() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentMode = (searchParams.get("mode") as Mode) || "pagination";

  const handleModeChange = (mode: Mode) => {
    const params = new URLSearchParams(searchParams);
    params.set("mode", mode);

    // Reset page param when switching to infinite scroll modes
    if (mode !== "pagination") {
      params.delete("page");
    } else {
      // Reset to page 1 when switching to pagination
      params.set("page", "1");
    }

    router.push(`/users?${params.toString()}`);
  };

  return (
    <div className={styles.wrapper}>
      {modes.map(({ value, label }) => (
        <button
          key={value}
          className={`${styles.tab} ${currentMode === value ? styles.tabActive : ""}`}
          onClick={() => handleModeChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
