"use client";

import { useSyncExternalStore } from "react";
import {
  auditLogs,
  type AuditAction,
  type AuditLog,
} from "@/data/auditLogs";

// ブラウザ内の操作で増えた履歴。再読み込みでモジュールが初期化され、シードに戻る。
let logs: readonly AuditLog[] = auditLogs;
let nextNumber = auditLogs.reduce((max, log) => {
  const match = /^audit-(\d+)$/.exec(log.id);
  return match ? Math.max(max, Number(match[1])) : max;
}, 0) + 1;

// ログイン前に登録・削除・CSV出力しても、公開フィクスチャの管理者として残す。
const DEFAULT_ACTOR = "admin@example.com";
// 収集したアドレスではなく、このタブの操作だと分かる固定値。
const SESSION_IP = "203.0.113.10";
let currentActor = DEFAULT_ACTOR;

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return logs;
}

function getServerSnapshot() {
  return auditLogs;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function formatJstTimestamp(date: Date): string {
  const shifted = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${shifted.toISOString().slice(0, 19)}+09:00`;
}

type NewAuditLog = {
  action: AuditAction;
  target: string;
  summary: string;
  actor?: string;
};

export function recordAuditLog(entry: NewAuditLog): AuditLog {
  const actor = entry.actor?.trim() || currentActor;
  const next: AuditLog = {
    id: `audit-${String(nextNumber).padStart(3, "0")}`,
    timestamp: formatJstTimestamp(new Date()),
    actor,
    action: entry.action,
    target: entry.target,
    summary: entry.summary,
    ipAddress: SESSION_IP,
  };
  nextNumber += 1;
  logs = [next, ...logs];
  notify();
  return next;
}

export function recordLogin(email: string) {
  const actor = email.trim() || DEFAULT_ACTOR;
  currentActor = actor;
  return recordAuditLog({
    actor,
    action: "user.login",
    target: actor,
    summary: `${actor} がログインしました`,
  });
}

function personTarget(name: string, email: string): string {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  if (trimmedName !== "" && trimmedEmail !== "") {
    return `${trimmedName}（${trimmedEmail}）`;
  }
  return trimmedName || trimmedEmail;
}

export function recordUserCreate(name: string, email: string) {
  const target = personTarget(name, email);
  return recordAuditLog({
    action: "user.create",
    target,
    summary: `${target}を登録しました`,
  });
}

export function recordUserDelete(name: string, email: string) {
  const target = personTarget(name, email);
  return recordAuditLog({
    action: "user.delete",
    target,
    summary: `${target}を削除しました`,
  });
}

export function recordCsvExport(count: number) {
  const target = `ユーザー一覧（${count}件）`;
  return recordAuditLog({
    action: "user.export_csv",
    target,
    summary: `${target}をCSVエクスポートしました`,
  });
}

export function useAuditLogStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
