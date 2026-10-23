"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AUDIT_ACTION_OPTIONS,
  auditActionLabel,
  formatAuditTimestamp,
  queryAuditLogs,
  type AuditAction,
} from "@/data/auditLogs";
import { useAuditLogStore } from "@/hooks/useAuditLogStore";
import styles from "@/styles/audit-logs.module.css";

function actionClass(action: AuditAction): string {
  switch (action) {
    case "user.login":
      return styles.actionLogin;
    case "user.create":
      return styles.actionCreate;
    case "user.delete":
      return styles.actionDelete;
    case "user.permission_change":
      return styles.actionPermission;
    case "user.export_csv":
      return styles.actionExport;
    case "user.update":
      return styles.actionUpdate;
    case "user.disable":
      return styles.actionDisable;
    default:
      return styles.actionDefault;
  }
}

export default function AuditLogView() {
  const logs = useAuditLogStore();
  const [action, setAction] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");

  const result = useMemo(
    () => queryAuditLogs(logs, { action, keyword }),
    [logs, action, keyword],
  );

  const filtered = action !== "" || keyword !== "";

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setKeyword(keywordInput.trim());
  };

  const handleKeywordChange = (value: string) => {
    setKeywordInput(value);
    if (value.trim() === "") setKeyword("");
  };

  const handleClear = () => {
    setAction("");
    setKeywordInput("");
    setKeyword("");
  };

  const emptyMessage = (() => {
    if (action !== "" && keyword !== "") {
      return `操作「${auditActionLabel(action)}」かつキーワード「${keyword}」に一致する監査ログはありません。`;
    }
    if (action !== "") {
      return `操作「${auditActionLabel(action)}」の監査ログはありません。`;
    }
    if (keyword !== "") {
      return `キーワード「${keyword}」に一致する監査ログはありません。`;
    }
    return "監査ログはありません。";
  })();

  return (
    <section className={styles.page}>
      <div className={styles.titleRow}>
        <div>
          <h1 className={styles.title}>監査ログ</h1>
          <p className={styles.lead}>
            ログイン、ユーザー登録、削除、CSVエクスポートなどの操作履歴です。再読み込みすると初期データに戻ります。
          </p>
        </div>
        <span className={styles.count}>
          {filtered
            ? `${result.totalCount} 件が該当 / 全 ${logs.length} 件`
            : `全 ${logs.length} 件`}
        </span>
      </div>

      <form className={styles.filterRow} role="search" onSubmit={handleSearch}>
        <div className={styles.filterField}>
          <label htmlFor="audit-action" className={styles.filterLabel}>
            操作種別
          </label>
          <select
            id="audit-action"
            name="action"
            className={styles.select}
            value={action}
            onChange={(event) => setAction(event.target.value)}
          >
            <option value="">すべて</option>
            {AUDIT_ACTION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {auditActionLabel(option)}（{option}）
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterFieldGrow}>
          <label htmlFor="audit-keyword" className={styles.filterLabel}>
            キーワード
          </label>
          <input
            id="audit-keyword"
            name="keyword"
            type="search"
            className={styles.searchInput}
            value={keywordInput}
            onChange={(event) => handleKeywordChange(event.target.value)}
            placeholder="操作者、対象、概要、IPアドレス"
            autoComplete="off"
          />
        </div>

        <div className={styles.filterActions}>
          <button type="submit" className={styles.searchButton}>
            検索
          </button>
          {filtered && (
            <button type="button" className={styles.clearButton} onClick={handleClear}>
              クリア
            </button>
          )}
        </div>
      </form>

      {result.logs.length === 0 ? (
        <p className={styles.empty}>{emptyMessage}</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table} aria-label="監査ログ">
            <thead>
              <tr>
                <th scope="col">日時 (JST)</th>
                <th scope="col">操作者</th>
                <th scope="col">操作</th>
                <th scope="col">対象</th>
                <th scope="col">概要</th>
                <th scope="col">IPアドレス</th>
              </tr>
            </thead>
            <tbody>
              {result.logs.map((log) => (
                <tr key={log.id} data-audit-id={log.id} data-action={log.action}>
                  <td className={styles.timestamp}>
                    <time dateTime={log.timestamp}>{formatAuditTimestamp(log.timestamp)}</time>
                  </td>
                  <td>{log.actor}</td>
                  <td>
                    <span className={`${styles.actionBadge} ${actionClass(log.action)}`}>
                      {auditActionLabel(log.action)}
                    </span>
                    <span className={styles.actionCode}>{log.action}</span>
                  </td>
                  <td>{log.target}</td>
                  <td>{log.summary}</td>
                  <td className={styles.ipAddress}>{log.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
