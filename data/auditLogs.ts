export const AUDIT_ACTIONS = [
  "ユーザー登録",
  "ユーザー削除",
  "権限変更",
  "ログイン",
  "CSVエクスポート",
  "SAML SSO設定変更",
  "SCIMプロビジョニング",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ACTION_FILTERS = [
  "すべて",
  "ユーザー操作",
  "認証・SSO",
  "エクスポート",
] as const;

export type AuditActionFilter = (typeof AUDIT_ACTION_FILTERS)[number];

export type AuditLog = {
  id: string;
  timestamp: string;
  actor: string;
  action: AuditAction;
  target: string;
  ipAddress: string;
  detail: string;
};

const ACTIONS_BY_FILTER: Record<
  Exclude<AuditActionFilter, "すべて">,
  readonly AuditAction[]
> = {
  ユーザー操作: ["ユーザー登録", "ユーザー削除", "権限変更"],
  "認証・SSO": ["ログイン", "SAML SSO設定変更", "SCIMプロビジョニング"],
  エクスポート: ["CSVエクスポート"],
};

const AUDIT_ACTION_SET: ReadonlySet<string> = new Set(AUDIT_ACTIONS);
const FILTER_SET: ReadonlySet<string> = new Set(AUDIT_ACTION_FILTERS);
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/;
const IPV4_PATTERN =
  /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export function isAuditAction(value: unknown): value is AuditAction {
  return typeof value === "string" && AUDIT_ACTION_SET.has(value);
}

export function isAuditActionFilter(value: string): value is AuditActionFilter {
  return FILTER_SET.has(value);
}

export function isAuditTimestamp(value: string): boolean {
  if (!TIMESTAMP_PATTERN.test(value)) return false;
  const [datePart, timePart] = value.slice(0, 19).split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  if (hour > 23 || minute > 59 || second > 59) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

export function isIpv4(value: string): boolean {
  return IPV4_PATTERN.test(value);
}

export function formatTokyoTimestamp(date: Date): string {
  const shifted = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}+09:00`;
}

export function formatAuditTimestamp(timestamp: string): string {
  return timestamp.replace("T", " ").replace("+09:00", "");
}

export function matchesActionFilter(action: AuditAction, filter: string): boolean {
  const normalized = filter.trim();
  if (normalized === "" || normalized === "すべて") return true;
  if (
    normalized === "ユーザー操作" ||
    normalized === "認証・SSO" ||
    normalized === "エクスポート"
  ) {
    return ACTIONS_BY_FILTER[normalized].includes(action);
  }
  return action === normalized;
}

export function queryAuditLogs(
  logs: readonly AuditLog[],
  params: { action?: string | null; keyword?: string | null; limit?: number | null },
): { logs: AuditLog[]; totalCount: number; limit: number | null } {
  const action = params.action?.trim() ?? "";
  const keyword = params.keyword?.trim().toLowerCase() ?? "";
  const filtered = logs.filter((log) => {
    if (!matchesActionFilter(log.action, action)) return false;
    if (keyword === "") return true;
    return (
      log.actor.toLowerCase().includes(keyword) ||
      log.target.toLowerCase().includes(keyword) ||
      log.detail.toLowerCase().includes(keyword)
    );
  });
  const limit = params.limit ?? null;
  return {
    logs: limit === null ? filtered : filtered.slice(0, limit),
    totalCount: filtered.length,
    limit,
  };
}

// 再読み込みのたびに同じ並びになるよう、時刻も件数も固定している。
const seed: AuditLog[] = [
  {
    id: "AL-020",
    timestamp: "2026-03-20T18:42:11+09:00",
    actor: "admin@example.com",
    action: "ログイン",
    target: "管理画面",
    ipAddress: "192.0.2.10",
    detail: "管理画面にログインしました",
  },
  {
    id: "AL-019",
    timestamp: "2026-03-20T18:05:33+09:00",
    actor: "admin@example.com",
    action: "CSVエクスポート",
    target: "ユーザー一覧",
    ipAddress: "192.0.2.10",
    detail: "ユーザー一覧をCSVでダウンロードしました（100件）",
  },
  {
    id: "AL-018",
    timestamp: "2026-03-20T17:48:02+09:00",
    actor: "admin@example.com",
    action: "ユーザー登録",
    target: "sato.hanako@example.com",
    ipAddress: "192.0.2.10",
    detail: "佐藤 花子（sato.hanako@example.com）を営業部に登録しました",
  },
  {
    id: "AL-017",
    timestamp: "2026-03-20T16:12:44+09:00",
    actor: "admin@example.com",
    action: "権限変更",
    target: "tanaka.taro@example.com",
    ipAddress: "192.0.2.10",
    detail: "田中 太郎の権限を一般から管理者に変更しました",
  },
  {
    id: "AL-016",
    timestamp: "2026-03-20T11:27:19+09:00",
    actor: "it-admin@example.com",
    action: "SAML SSO設定変更",
    target: "IdPメタデータ",
    ipAddress: "192.0.2.24",
    detail: "テスト用IdPのメタデータURLを更新しました",
  },
  {
    id: "AL-015",
    timestamp: "2026-03-19T21:03:55+09:00",
    actor: "scim-sync@example.com",
    action: "SCIMプロビジョニング",
    target: "開発部",
    ipAddress: "192.0.2.40",
    detail: "SCIMで開発部のユーザー3件を同期しました",
  },
  {
    id: "AL-014",
    timestamp: "2026-03-19T15:41:08+09:00",
    actor: "admin@example.com",
    action: "ユーザー削除",
    target: "yamada.kenta@example.com",
    ipAddress: "192.0.2.10",
    detail: "山田 健太（yamada.kenta@example.com）を削除しました",
  },
  {
    id: "AL-013",
    timestamp: "2026-03-19T10:16:27+09:00",
    actor: "suzuki.misaki@example.com",
    action: "ログイン",
    target: "管理画面",
    ipAddress: "192.0.2.18",
    detail: "管理画面にログインしました",
  },
  {
    id: "AL-012",
    timestamp: "2026-03-18T19:22:41+09:00",
    actor: "admin@example.com",
    action: "ユーザー登録",
    target: "takahashi.ichiro@example.com",
    ipAddress: "192.0.2.10",
    detail: "高橋 一郎（takahashi.ichiro@example.com）を開発部に登録しました",
  },
  {
    id: "AL-011",
    timestamp: "2026-03-18T14:08:03+09:00",
    actor: "it-admin@example.com",
    action: "SAML SSO設定変更",
    target: "SSO有効化",
    ipAddress: "192.0.2.24",
    detail: "テスト用のSAML SSOを有効にしました",
  },
  {
    id: "AL-010",
    timestamp: "2026-03-18T09:55:16+09:00",
    actor: "admin@example.com",
    action: "CSVエクスポート",
    target: "ユーザー一覧",
    ipAddress: "192.0.2.10",
    detail: "絞り込み後のユーザーをCSVでダウンロードしました（12件）",
  },
  {
    id: "AL-009",
    timestamp: "2026-03-17T17:33:49+09:00",
    actor: "admin@example.com",
    action: "権限変更",
    target: "watanabe.yumi@example.com",
    ipAddress: "192.0.2.10",
    detail: "渡辺 由美の権限を管理者から閲覧のみに変更しました",
  },
  {
    id: "AL-008",
    timestamp: "2026-03-17T13:20:12+09:00",
    actor: "scim-sync@example.com",
    action: "SCIMプロビジョニング",
    target: "人事部",
    ipAddress: "192.0.2.40",
    detail: "SCIMで人事部のユーザー1件を無効化しました",
  },
  {
    id: "AL-007",
    timestamp: "2026-03-17T09:04:38+09:00",
    actor: "admin@example.com",
    action: "ログイン",
    target: "管理画面",
    ipAddress: "192.0.2.10",
    detail: "管理画面にログインしました",
  },
  {
    id: "AL-006",
    timestamp: "2026-03-16T18:47:55+09:00",
    actor: "admin@example.com",
    action: "ユーザー削除",
    target: "ito.daisuke@example.com",
    ipAddress: "192.0.2.10",
    detail: "伊藤 大輔（ito.daisuke@example.com）を削除しました",
  },
  {
    id: "AL-005",
    timestamp: "2026-03-16T15:11:23+09:00",
    actor: "admin@example.com",
    action: "ユーザー登録",
    target: "nakamura.sakura@example.com",
    ipAddress: "192.0.2.10",
    detail: "中村 さくら（nakamura.sakura@example.com）を経理部に登録しました",
  },
  {
    id: "AL-004",
    timestamp: "2026-03-16T11:02:07+09:00",
    actor: "it-admin@example.com",
    action: "SAML SSO設定変更",
    target: "ログイン方針",
    ipAddress: "192.0.2.24",
    detail: "パスワードログインを残したままSAML SSOを許可しました",
  },
  {
    id: "AL-003",
    timestamp: "2026-03-15T16:28:44+09:00",
    actor: "admin@example.com",
    action: "権限変更",
    target: "kobayashi.shota@example.com",
    ipAddress: "192.0.2.10",
    detail: "小林 翔太の権限を閲覧のみから一般に変更しました",
  },
  {
    id: "AL-002",
    timestamp: "2026-03-15T10:45:19+09:00",
    actor: "scim-sync@example.com",
    action: "SCIMプロビジョニング",
    target: "全社",
    ipAddress: "192.0.2.40",
    detail: "SCIMの定期同期が完了しました（作成2件、更新5件）",
  },
  {
    id: "AL-001",
    timestamp: "2026-03-14T09:30:00+09:00",
    actor: "admin@example.com",
    action: "CSVエクスポート",
    target: "無効ユーザー",
    ipAddress: "192.0.2.10",
    detail: "無効ユーザーをCSVでダウンロードしました（20件）",
  },
];

function assertSeed(logs: readonly AuditLog[]) {
  if (logs.length < 15 || logs.length > 25) {
    throw new Error(`audit log seed must contain 15 to 25 entries, got ${logs.length}`);
  }
  const ids = new Set<string>();
  for (const log of logs) {
    if (ids.has(log.id)) throw new Error(`duplicate audit log id: ${log.id}`);
    ids.add(log.id);
    if (!isAuditTimestamp(log.timestamp)) {
      throw new Error(`invalid audit log timestamp: ${log.id}`);
    }
    if (!isIpv4(log.ipAddress)) {
      throw new Error(`invalid audit log ip: ${log.id}`);
    }
  }
}

assertSeed(seed);

export const auditLogs: readonly AuditLog[] = [...seed].sort((a, b) => {
  if (a.timestamp === b.timestamp) return a.id < b.id ? 1 : -1;
  return a.timestamp < b.timestamp ? 1 : -1;
});
