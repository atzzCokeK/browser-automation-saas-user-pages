import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { recordUserCreate, recordUserDelete, recordUserEdit } from "@/hooks/useAuditLogStore";
import { addUser, deleteUser, findUser, updateUser, useUserStore } from "@/hooks/useUserStore";
import type { User } from "@/data/users";
import { generateScimTestToken } from "@/src/scimToken";
import styles from "@/styles/scim.module.css";

type ProvisionedUser = {
  scimId: string;
  localId: number;
  userName: string;
};

type ScimSession = {
  token: string;
  sequence: number;
  provisioned: ProvisionedUser | null;
};

type Exchange = {
  method: string;
  path: string;
  status: number;
  requestBody: string;
  responseBody: string;
};

type ScimLog = {
  method: string;
  path: string;
  status: number;
  timestamp: string;
  summary: string;
};

type Notice = {
  tone: "success" | "failure";
  text: string;
};

const ENTERPRISE = "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User";

let scimSession: ScimSession = {
  token: generateScimTestToken(),
  sequence: 0,
  provisioned: null,
};

function formatToday(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function pretty(text: string): string {
  if (!text) return "";
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function statusLabel(status: number): string {
  if (status === 200) return "200 OK";
  if (status === 201) return "201 Created";
  if (status === 204) return "204 No Content";
  return String(status);
}

function isLog(value: unknown): value is ScimLog {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.method === "string" &&
    typeof entry.path === "string" &&
    typeof entry.status === "number" &&
    typeof entry.timestamp === "string" &&
    typeof entry.summary === "string"
  );
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function displayNameOf(resource: Record<string, unknown>): string {
  if (typeof resource.displayName === "string" && resource.displayName.trim()) {
    return resource.displayName.trim();
  }
  const name = resource.name;
  if (name && typeof name === "object") {
    const record = name as Record<string, unknown>;
    const formatted = readString(record.formatted).trim();
    if (formatted) return formatted;
    const joined = [readString(record.familyName), readString(record.givenName)]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ");
    if (joined) return joined;
  }
  return readString(resource.userName);
}

function departmentOf(resource: Record<string, unknown>): string {
  const enterprise = resource[ENTERPRISE];
  if (enterprise && typeof enterprise === "object") {
    const department = readString((enterprise as Record<string, unknown>).department).trim();
    if (department) return department;
  }
  return readString(resource.department).trim();
}

function titleOf(resource: Record<string, unknown>): string {
  const enterprise = resource[ENTERPRISE];
  if (enterprise && typeof enterprise === "object") {
    return readString((enterprise as Record<string, unknown>).title).trim();
  }
  return "";
}

function errorDetail(text: string, status: number): string {
  try {
    const body = JSON.parse(text) as { detail?: unknown };
    if (typeof body.detail === "string" && body.detail) return body.detail;
  } catch {
    // The response body is shown separately.
  }
  return `HTTP ${status}`;
}

function profileChanged(before: User, after: User): boolean {
  return (
    before.name !== after.name ||
    before.email !== after.email ||
    before.department !== after.department ||
    before.position !== after.position ||
    before.permission !== after.permission ||
    before.status !== after.status ||
    before.joinDate !== after.joinDate ||
    before.notes !== after.notes
  );
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export default function ScimPage() {
  const baseUrl =
    typeof window === "undefined" ? "/api/scim/v2" : `${window.location.origin}/api/scim/v2`;
  const users = useUserStore();
  const [session, setSession] = useState(scimSession);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [logs, setLogs] = useState<ScimLog[]>([]);
  const [logError, setLogError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  async function loadLogs(token: string) {
    try {
      const response = await fetch(`${baseUrl}/logs`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/scim+json",
        },
      });
      const text = await response.text();
      if (!response.ok) {
        setLogError(`ログを取得できませんでした。${errorDetail(text, response.status)}`);
        setLogs([]);
        return;
      }
      const body = JSON.parse(text) as { Resources?: unknown };
      const resources = Array.isArray(body.Resources) ? body.Resources.filter(isLog) : [];
      setLogs(resources);
      setLogError("");
    } catch {
      setLogError("ログを取得できませんでした。");
      setLogs([]);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`${baseUrl}/logs`, {
          headers: {
            Authorization: `Bearer ${session.token}`,
            Accept: "application/scim+json",
          },
        });
        const text = await response.text();
        if (cancelled) return;
        if (!response.ok) {
          setLogError(`ログを取得できませんでした。${errorDetail(text, response.status)}`);
          setLogs([]);
          return;
        }
        const body = JSON.parse(text) as { Resources?: unknown };
        const resources = Array.isArray(body.Resources) ? body.Resources.filter(isLog) : [];
        setLogs(resources);
        setLogError("");
      } catch {
        if (!cancelled) {
          setLogError("ログを取得できませんでした。");
          setLogs([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [baseUrl, session.token]);

  function commitSession(next: ScimSession) {
    scimSession = next;
    setSession(next);
  }

  // 作成・更新・無効化・削除を、詳細画面と同じ監査ログへ 1 件残す。
  function reflectMutation(method: string, text: string, userNameHint: string, nextSequence: number): string {
    if (method === "DELETE") {
      const current = session.provisioned;
      if (!current) return "削除するユーザーがありません。";
      const before = findUser(users, current.localId);
      deleteUser(current.localId);
      recordUserDelete(before?.name || userNameHint, before?.email || current.userName);
      commitSession({ ...session, provisioned: null });
      return `${current.userName} を削除しました。監査ログに残しました。`;
    }

    const resource = JSON.parse(text) as Record<string, unknown>;
    const userName = readString(resource.userName) || userNameHint;
    const name = displayNameOf(resource) || "試験 太郎";
    const department = departmentOf(resource);
    const position = titleOf(resource);
    const status: User["status"] = resource.active === false ? "無効" : "有効";

    if (method === "POST") {
      const today = formatToday();
      const created = addUser({
        name,
        email: userName,
        department: department || "開発部",
        status,
        createdAt: today,
        position: position || "一般社員",
        permission: "general",
        joinDate: today,
        notes: "",
      });
      recordUserCreate(created.name, created.email);
      commitSession({
        ...session,
        sequence: nextSequence,
        provisioned: { scimId: readString(resource.id), localId: created.id, userName },
      });
      return `${userName} をプロビジョニングしました。ユーザー管理と監査ログに反映しました。`;
    }

    const current = session.provisioned;
    if (!current) return "反映するユーザーがありません。";
    const before = findUser(users, current.localId);
    if (!before) return "ユーザー管理に対象がありません。";
    const after: User = {
      ...before,
      name: name || before.name,
      email: userName || before.email,
      department: department || before.department,
      position: position || before.position,
      status,
    };
    if (profileChanged(before, after)) {
      updateUser(before.id, after);
      recordUserEdit(before, after);
    }
    if (before.status !== "無効" && after.status === "無効") {
      return `${userName} を無効化しました。ユーザー管理のステータスを無効にし、監査ログに残しました。`;
    }
    return `${userName} を更新しました。ユーザー管理と監査ログに反映しました。`;
  }

  async function run(task: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await task();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function send(
    method: string,
    path: string,
    body: unknown | null,
  ): Promise<{ ok: boolean; status: number; text: string }> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${session.token}`,
      Accept: "application/scim+json",
    };
    if (body !== null) headers["Content-Type"] = "application/scim+json";
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === null ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    setExchange({
      method,
      path,
      status: response.status,
      requestBody: body === null ? "" : JSON.stringify(body, null, 2),
      responseBody: text,
    });
    await loadLogs(session.token);
    return { ok: response.ok, status: response.status, text };
  }

  const provision = () =>
    run(async () => {
      const sequence = session.sequence + 1;
      const userName = `scim.user.${sequence}@example.com`;
      const payload = {
        schemas: [
          "urn:ietf:params:scim:schemas:core:2.0:User",
          ENTERPRISE,
        ],
        userName,
        name: { familyName: "試験", givenName: "太郎" },
        displayName: "試験 太郎",
        active: true,
        emails: [{ value: userName, type: "work", primary: true }],
        [ENTERPRISE]: { department: "開発部", title: "一般社員" },
      };
      try {
        const result = await send("POST", "/Users", payload);
        if (!result.ok) {
          setNotice({
            tone: "failure",
            text: `SCIMリクエストに失敗しました。${errorDetail(result.text, result.status)}`,
          });
          return;
        }
        setNotice({
          tone: "success",
          text: reflectMutation("POST", result.text, userName, sequence),
        });
      } catch {
        setNotice({ tone: "failure", text: "SCIMエンドポイントに接続できませんでした。" });
      }
    });

  const deactivate = () =>
    run(async () => {
      if (!session.provisioned) {
        setNotice({ tone: "failure", text: "先にユーザーをプロビジョニングしてください。" });
        return;
      }
      const { scimId, userName } = session.provisioned;
      const payload = {
        schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
        Operations: [{ op: "replace", path: "active", value: false }],
      };
      try {
        const result = await send("PATCH", `/Users/${encodeURIComponent(scimId)}`, payload);
        if (!result.ok) {
          setNotice({
            tone: "failure",
            text: `SCIMリクエストに失敗しました。${errorDetail(result.text, result.status)}`,
          });
          return;
        }
        setNotice({
          tone: "success",
          text: reflectMutation("PATCH", result.text, userName, session.sequence),
        });
      } catch {
        setNotice({ tone: "failure", text: "SCIMエンドポイントに接続できませんでした。" });
      }
    });

  const filterUsers = () =>
    run(async () => {
      const userName = session.provisioned?.userName ?? "scim.user.1@example.com";
      const params = new URLSearchParams({
        filter: `userName eq "${userName}"`,
        startIndex: "1",
        count: "20",
      });
      try {
        const result = await send("GET", `/Users?${params.toString()}`, null);
        if (!result.ok) {
          setNotice({
            tone: "failure",
            text: `SCIMリクエストに失敗しました。${errorDetail(result.text, result.status)}`,
          });
          return;
        }
        const body = JSON.parse(result.text) as { totalResults?: unknown };
        const total = typeof body.totalResults === "number" ? body.totalResults : 0;
        setNotice({
          tone: "success",
          text: `${userName} を検索しました。該当は ${total} 件です。`,
        });
      } catch {
        setNotice({ tone: "failure", text: "SCIMエンドポイントに接続できませんでした。" });
      }
    });

  const regenerate = () => {
    commitSession({
      token: generateScimTestToken(),
      sequence: 0,
      provisioned: null,
    });
    setExchange(null);
    setNotice({
      tone: "success",
      text: "トークンを再生成しました。このトークンの SCIM ユーザーとログは空です。すでにユーザー管理へ反映したユーザーは、再読み込みまで残ります。",
    });
  };

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>SCIMプロビジョニング</h1>
      <p className={styles.lead}>
        IdP からの同期を試すためのダミー SCIM 2.0 です。ユーザーとリクエストログは Bearer
        トークンごとの短期メモリにだけ置き、それぞれ最大 50 件で古いものから捨てます。データベースには保存しません。ページを再読み込みすると新しいトークンになり、この画面は空に戻ります。
      </p>

      <section className={styles.card} aria-labelledby="scim-connection-title">
        <h2 id="scim-connection-title" className={styles.cardTitle}>
          接続情報
        </h2>
        <div className={styles.field}>
          <label htmlFor="scim-base-url" className={styles.label}>
            SCIM Base URL
          </label>
          <div className={styles.row}>
            <input id="scim-base-url" className={styles.input} readOnly value={baseUrl} />
            <button
              type="button"
              id="scim-copy-base-url"
              className={styles.secondaryButton}
              onClick={() =>
                void copyText(baseUrl).then((ok) =>
                  setNotice({
                    tone: ok ? "success" : "failure",
                    text: ok ? "ベース URL をコピーしました。" : "ベース URL のコピーに失敗しました。",
                  }),
                )
              }
            >
              ベース URL をコピー
            </button>
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="scim-bearer-token" className={styles.label}>
            Bearer Token
          </label>
          <div className={styles.row}>
            <input
              id="scim-bearer-token"
              className={styles.input}
              readOnly
              spellCheck={false}
              autoComplete="off"
              value={session.token}
            />
            <button
              type="button"
              id="scim-regenerate-token"
              className={styles.secondaryButton}
              onClick={regenerate}
              disabled={busy}
            >
              トークンを再生成
            </button>
            <button
              type="button"
              id="scim-copy-token"
              className={styles.secondaryButton}
              onClick={() =>
                void copyText(session.token).then((ok) =>
                  setNotice({
                    tone: ok ? "success" : "failure",
                    text: ok ? "トークンをコピーしました。" : "トークンのコピーに失敗しました。",
                  }),
                )
              }
            >
              トークンをコピー
            </button>
          </div>
          <p className={styles.hint}>Authorization ヘッダーは Bearer のあとにこのトークンを付けます。</p>
        </div>
      </section>

      <section
        className={styles.card}
        aria-labelledby="scim-sim-title"
        aria-busy={busy}
        {...{
          toolname: "scim_request_simulator",
          tooldescription:
            "Send a dummy SCIM 2.0 request. Provision a user with POST /Users, deactivate the last provisioned user with PATCH, or filter users by userName.",
        }}
      >
        <h2 id="scim-sim-title" className={styles.cardTitle}>
          SCIMリクエストシミュレーター
        </h2>
        <div className={styles.actions}>
          <button type="button" id="scim-provision" className={styles.button} onClick={provision} disabled={busy}>
            ユーザーをプロビジョニング
          </button>
          <button
            type="button"
            id="scim-deactivate"
            className={styles.secondaryButton}
            onClick={deactivate}
            disabled={busy}
          >
            ユーザーを無効化
          </button>
          <button
            type="button"
            id="scim-filter"
            className={styles.secondaryButton}
            onClick={filterUsers}
            disabled={busy}
          >
            ユーザーを検索
          </button>
        </div>
        <p className={styles.hint}>
          {session.provisioned
            ? `無効化の対象: ${session.provisioned.userName}`
            : "無効化の対象はまだありません。"}
        </p>
        <p
          id="scim-simulator-status"
          className={`${styles.status} ${notice?.tone === "failure" ? styles.failure : styles.success}`}
          role="status"
          aria-live="polite"
        >
          {notice?.text ?? ""}
        </p>
        {session.provisioned ? (
          <p className={styles.links}>
            <Link to="/users">ユーザー一覧で確認</Link>
            <Link to={`/users/${session.provisioned.localId}`}>詳細で確認</Link>
          </p>
        ) : null}
      </section>

      <section className={styles.card} aria-labelledby="scim-exchange-title">
        <h2 id="scim-exchange-title" className={styles.cardTitle}>
          リクエストとレスポンス
        </h2>
        {exchange ? (
          <>
            <dl className={styles.meta}>
              <dt>メソッド</dt>
              <dd>{exchange.method}</dd>
              <dt>パス</dt>
              <dd>{exchange.path}</dd>
              <dt>ステータス</dt>
              <dd>
                {statusLabel(exchange.status)}{" "}
                {exchange.status >= 200 && exchange.status < 300 ? "成功" : "失敗"}
              </dd>
            </dl>
            <h3 className={styles.blockTitle}>リクエスト</h3>
            <pre id="scim-request-body" className={styles.pre}>
              {exchange.requestBody || "ボディはありません"}
            </pre>
            <h3 className={styles.blockTitle}>レスポンス</h3>
            <pre id="scim-response-body" className={styles.pre}>
              {exchange.responseBody ? pretty(exchange.responseBody) : "ボディはありません"}
            </pre>
          </>
        ) : (
          <p className={styles.empty}>まだリクエストはありません。</p>
        )}
      </section>

      <section className={styles.card} aria-labelledby="scim-log-title">
        <h2 id="scim-log-title" className={styles.cardTitle}>
          SCIMリクエストログ
        </h2>
        {logError ? <p className={`${styles.status} ${styles.failure}`}>{logError}</p> : null}
        {logs.length === 0 ? (
          <p className={styles.empty}>ログはまだありません。</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>時刻</th>
                  <th>メソッド</th>
                  <th>パス</th>
                  <th>ステータス</th>
                  <th>概要</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry, index) => (
                  <tr key={`${entry.timestamp}-${entry.method}-${index}`}>
                    <td>{entry.timestamp}</td>
                    <td>{entry.method}</td>
                    <td className={styles.path}>{entry.path}</td>
                    <td>
                      {entry.status} {entry.status >= 200 && entry.status < 300 ? "成功" : "失敗"}
                    </td>
                    <td className={styles.summary}>{entry.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
