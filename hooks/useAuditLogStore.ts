"use client";

import { useSyncExternalStore } from "react";
import { formatTokyoTimestamp, type AuditAction, type AuditLog } from "@/data/auditLogs";

export type NewAuditLog = {
  actor: string;
  action: AuditAction;
  target: string;
  detail: string;
};

type AuditLogStore = {
  sessionLogs: readonly AuditLog[];
};

// 追加分はこのタブのメモリだけに置く。再読み込みでシードデータに戻る。
const EMPTY_STORE: AuditLogStore = { sessionLogs: [] };
const SESSION_ACTOR = "admin@example.com";
const SESSION_IP = "192.0.2.10";

let sessionActor = SESSION_ACTOR;
let store: AuditLogStore = EMPTY_STORE;
let nextSessionId = 1;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return store;
}

function getServerSnapshot() {
  return EMPTY_STORE;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function clip(value: string, max: number) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max);
}

export function getSessionActor() {
  return sessionActor;
}

export function recordAuditLog(entry: NewAuditLog) {
  const actor = clip(entry.actor, 200) || sessionActor;
  if (entry.action === "ログイン") {
    sessionActor = actor;
  }

  const id = `session-${String(nextSessionId).padStart(3, "0")}`;
  nextSessionId += 1;

  const log: AuditLog = {
    id,
    timestamp: formatTokyoTimestamp(new Date()),
    actor,
    action: entry.action,
    target: clip(entry.target, 200) || "-",
    ipAddress: SESSION_IP,
    detail: clip(entry.detail, 500) || entry.action,
  };

  store = { sessionLogs: [log, ...store.sessionLogs] };
  notify();
}

export function useAuditLogStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
