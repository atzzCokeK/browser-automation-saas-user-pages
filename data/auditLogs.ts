export const AUDIT_ACTION_OPTIONS = [
  "user.login",
  "user.create",
  "user.delete",
  "user.permission_change",
  "user.export_csv",
  "user.update",
  "user.disable",
] as const;

export type AuditAction = (typeof AUDIT_ACTION_OPTIONS)[number];

export type AuditLog = {
  id: string;
  timestamp: string;
  actor: string;
  action: AuditAction;
  target: string;
  summary: string;
  ipAddress: string;
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  "user.login": "ログイン",
  "user.create": "ユーザー作成",
  "user.delete": "ユーザー削除",
  "user.permission_change": "権限変更",
  "user.export_csv": "CSVエクスポート",
  "user.update": "ユーザー更新",
  "user.disable": "アカウント無効化",
};

export function auditActionLabel(action: string): string {
  if (action in AUDIT_ACTION_LABELS) {
    return AUDIT_ACTION_LABELS[action as AuditAction];
  }
  return action;
}

// JST の壁時計を ISO 8601（+09:00）から「YYYY-MM-DD HH:mm:ss」にする。
export function formatAuditTimestamp(timestamp: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/.exec(timestamp);
  if (!match) return timestamp;
  return `${match[1]} ${match[2]}`;
}

// 初期表示用。時刻も IP も固定で、再読み込みのたびに同じ一覧になる。
// IP は文書用例（RFC 5737）であり、実在の端末アドレスではない。
export const auditLogs: readonly AuditLog[] = [
  {
    id: "audit-001",
    timestamp: "2026-10-23T09:12:04+09:00",
    actor: "admin@example.com",
    action: "user.login",
    target: "admin@example.com",
    summary: "admin@example.com がログインしました",
    ipAddress: "203.0.113.10",
  },
  {
    id: "audit-002",
    timestamp: "2026-10-23T09:05:41+09:00",
    actor: "admin@example.com",
    action: "user.export_csv",
    target: "ユーザー一覧（120件）",
    summary: "ユーザー一覧（120件）をCSVエクスポートしました",
    ipAddress: "203.0.113.10",
  },
  {
    id: "audit-003",
    timestamp: "2026-10-22T18:41:22+09:00",
    actor: "admin@example.com",
    action: "user.delete",
    target: "高橋 美咲（takahashi.misaki@example.com）",
    summary: "高橋 美咲（takahashi.misaki@example.com）を削除しました",
    ipAddress: "203.0.113.10",
  },
  {
    id: "audit-004",
    timestamp: "2026-10-22T16:20:08+09:00",
    actor: "admin@example.com",
    action: "user.create",
    target: "渡辺 大輔（watanabe.daisuke@example.com）",
    summary: "渡辺 大輔（watanabe.daisuke@example.com）を登録しました",
    ipAddress: "203.0.113.10",
  },
  {
    id: "audit-005",
    timestamp: "2026-10-22T14:03:55+09:00",
    actor: "hr.manager@example.com",
    action: "user.permission_change",
    target: "伊藤 由美（ito.yumi@example.com）",
    summary: "伊藤 由美 の権限を「管理者」から「閲覧のみ」に変更しました",
    ipAddress: "198.51.100.24",
  },
  {
    id: "audit-006",
    timestamp: "2026-10-22T11:28:17+09:00",
    actor: "admin@example.com",
    action: "user.update",
    target: "鈴木 健太（suzuki.kenta@example.com）",
    summary: "鈴木 健太 の部署を営業部から開発部に変更しました",
    ipAddress: "203.0.113.10",
  },
  {
    id: "audit-007",
    timestamp: "2026-10-21T17:46:33+09:00",
    actor: "admin@example.com",
    action: "user.disable",
    target: "高橋 美咲（takahashi.misaki@example.com）",
    summary: "高橋 美咲 のアカウントを無効化しました",
    ipAddress: "203.0.113.10",
  },
  {
    id: "audit-008",
    timestamp: "2026-10-21T10:15:02+09:00",
    actor: "sato.hanako@example.com",
    action: "user.login",
    target: "sato.hanako@example.com",
    summary: "sato.hanako@example.com がログインしました",
    ipAddress: "198.51.100.24",
  },
  {
    id: "audit-009",
    timestamp: "2026-10-20T15:52:44+09:00",
    actor: "admin@example.com",
    action: "user.export_csv",
    target: "ユーザー一覧（118件）",
    summary: "ユーザー一覧（118件）をCSVエクスポートしました",
    ipAddress: "203.0.113.10",
  },
  {
    id: "audit-010",
    timestamp: "2026-10-20T13:07:19+09:00",
    actor: "hr.manager@example.com",
    action: "user.create",
    target: "田中 太郎（tanaka.taro@example.com）",
    summary: "田中 太郎（tanaka.taro@example.com）を登録しました",
    ipAddress: "198.51.100.24",
  },
  {
    id: "audit-011",
    timestamp: "2026-10-18T09:33:51+09:00",
    actor: "admin@example.com",
    action: "user.delete",
    target: "小林 直樹（kobayashi.naoki@example.com）",
    summary: "小林 直樹（kobayashi.naoki@example.com）を削除しました",
    ipAddress: "192.0.2.45",
  },
  {
    id: "audit-012",
    timestamp: "2026-10-17T16:18:27+09:00",
    actor: "admin@example.com",
    action: "user.permission_change",
    target: "山本 翔太（yamamoto.shota@example.com）",
    summary: "山本 翔太 の権限を「一般」から「管理者」に変更しました",
    ipAddress: "203.0.113.10",
  },
  {
    id: "audit-013",
    timestamp: "2026-10-16T11:44:06+09:00",
    actor: "yamamoto.shota@example.com",
    action: "user.login",
    target: "yamamoto.shota@example.com",
    summary: "yamamoto.shota@example.com がログインしました",
    ipAddress: "192.0.2.88",
  },
  {
    id: "audit-014",
    timestamp: "2026-10-15T14:22:38+09:00",
    actor: "admin@example.com",
    action: "user.update",
    target: "佐藤 花子（sato.hanako@example.com）",
    summary: "佐藤 花子 のステータスを無効から有効に変更しました",
    ipAddress: "203.0.113.10",
  },
  {
    id: "audit-015",
    timestamp: "2026-10-14T10:05:13+09:00",
    actor: "hr.manager@example.com",
    action: "user.create",
    target: "加藤 健太（kato.kenta@example.com）",
    summary: "加藤 健太（kato.kenta@example.com）を登録しました",
    ipAddress: "198.51.100.24",
  },
  {
    id: "audit-016",
    timestamp: "2026-10-11T18:09:47+09:00",
    actor: "admin@example.com",
    action: "user.export_csv",
    target: "ユーザー一覧（115件）",
    summary: "ユーザー一覧（115件）をCSVエクスポートしました",
    ipAddress: "203.0.113.10",
  },
  {
    id: "audit-017",
    timestamp: "2026-10-09T09:27:55+09:00",
    actor: "admin@example.com",
    action: "user.disable",
    target: "吉田 愛（yoshida.ai@example.com）",
    summary: "吉田 愛 のアカウントを無効化しました",
    ipAddress: "203.0.113.48",
  },
  {
    id: "audit-018",
    timestamp: "2026-10-07T13:41:20+09:00",
    actor: "admin@example.com",
    action: "user.login",
    target: "admin@example.com",
    summary: "admin@example.com がログインしました",
    ipAddress: "192.0.2.15",
  },
];

export type AuditLogQuery = {
  action?: string | null;
  keyword?: string | null;
  limit?: number | null;
};

export type AuditLogQueryResult = {
  logs: AuditLog[];
  totalCount: number;
  limit: number | null;
};

export function queryAuditLogs(
  logs: readonly AuditLog[],
  options: AuditLogQuery = {},
): AuditLogQueryResult {
  const action = options.action?.trim() ?? "";
  const keyword = options.keyword?.trim().toLowerCase() ?? "";

  const matched = logs.filter((log) => {
    if (action !== "" && log.action !== action) return false;
    if (keyword === "") return true;
    const haystack = [
      log.id,
      log.timestamp,
      formatAuditTimestamp(log.timestamp),
      log.actor,
      log.action,
      auditActionLabel(log.action),
      log.target,
      log.summary,
      log.ipAddress,
    ]
      .join("\n")
      .toLowerCase();
    return haystack.includes(keyword);
  });

  const limit =
    options.limit == null || !Number.isFinite(options.limit)
      ? null
      : Math.max(0, Math.floor(options.limit));

  return {
    logs: limit === null ? matched : matched.slice(0, limit),
    totalCount: matched.length,
    limit,
  };
}
