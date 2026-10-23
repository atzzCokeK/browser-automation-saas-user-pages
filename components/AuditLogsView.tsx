"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AUDIT_ACTION_FILTERS,
  auditLogs,
  formatAuditTimestamp,
  isAuditActionFilter,
  queryAuditLogs,
  type AuditActionFilter,
  type AuditLog,
} from "@/data/auditLogs";
import { useAuditLogStore } from "@/hooks/useAuditLogStore";
import styles from "@/styles/audit-logs.module.css";

function downloadJson(logs: readonly AuditLog[]) {
  const payload = {
    logs,
    totalCount: logs.length,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "audit-logs.json";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditLogsView() {
  const { sessionLogs } = useAuditLogStore();
  const [actionFilter, setActionFilter] = useState<AuditActionFilter>("すべて");
  const [searchInput, setSearchInput] = useState("");
  const [keyword, setKeyword] = useState("");

  const logs = useMemo(() => [...sessionLogs, ...auditLogs], [sessionLogs]);
  const visibleLogs = useMemo(
    () => queryAuditLogs(logs, { action: actionFilter, keyword }).logs,
    [logs, actionFilter, keyword],
  );

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    setKeyword(searchInput.trim());
  };

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    if (value.trim() === "") setKeyword("");
  };

  return (
    <section className={styles.page}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>監査ログ</h1>
        <div className={styles.titleActions}>
          <button
            type="button"
            className={styles.jsonButton}
            onClick={() => downloadJson(visibleLogs)}
          >
            JSONダウンロード
          </button>
          <span className={styles.count} aria-live="polite">
            全 {visibleLogs.length} 件
          </span>
        </div>
      </div>

      <form className={styles.filterRow} role="search" onSubmit={handleSearchSubmit}>
        <label className={styles.filterLabel} htmlFor="audit-action-filter">
          操作種別
        </label>
        <select
          id="audit-action-filter"
          name="action"
          className={styles.select}
          value={actionFilter}
          onChange={(event) => {
            const value = event.target.value;
            if (isAuditActionFilter(value)) setActionFilter(value);
          }}
        >
          {AUDIT_ACTION_FILTERS.map((filter) => (
            <option key={filter} value={filter}>
              {filter}
            </option>
          ))}
        </select>
        <input
          id="audit-log-search"
          name="q"
          type="search"
          className={styles.searchInput}
          value={searchInput}
          onChange={(event) => handleSearchInputChange(event.target.value)}
          placeholder="操作者・対象・詳細で検索"
          aria-label="操作者・対象・詳細で検索"
          autoComplete="off"
        />
        <button type="submit" className={styles.searchButton}>
          検索
        </button>
        {keyword !== "" && (
          <span className={styles.searchResult}>{visibleLogs.length} 件が該当</span>
        )}
      </form>

      {visibleLogs.length === 0 ? (
        <p className={styles.empty}>条件に一致する監査ログは見つかりませんでした。</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table} aria-label="監査ログ">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">日時</th>
                <th scope="col">操作者</th>
                <th scope="col">操作</th>
                <th scope="col">対象</th>
                <th scope="col">IPアドレス</th>
                <th scope="col">詳細</th>
              </tr>
            </thead>
            <tbody>
              {visibleLogs.map((log) => (
                <tr key={log.id}>
                  <td className={styles.nowrap}>{log.id}</td>
                  <td className={styles.nowrap}>{formatAuditTimestamp(log.timestamp)}</td>
                  <td>{log.actor}</td>
                  <td className={styles.nowrap}>{log.action}</td>
                  <td>{log.target}</td>
                  <td className={styles.nowrap}>{log.ipAddress}</td>
                  <td>{log.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
