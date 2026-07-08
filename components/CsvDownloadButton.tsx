"use client";

import { type User } from "@/data/users";
import styles from "@/styles/csv-download.module.css";

type Props = {
  users: User[];
};

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function generateCsv(users: User[]): string {
  const header = ["ID", "ユーザー名", "メールアドレス", "部署", "ステータス", "作成日"];
  const rows = users.map((user) =>
    [
      String(user.id),
      user.name,
      user.email,
      user.department,
      user.status,
      user.createdAt,
    ].map(escapeCsvField).join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

export default function CsvDownloadButton({ users }: Props) {
  const handleDownload = () => {
    const csv = generateCsv(users);
    const bom = "﻿";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const filename = `users_${yyyy}${mm}${dd}.csv`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button className={styles.button} onClick={handleDownload}>
      CSVダウンロード
    </button>
  );
}
