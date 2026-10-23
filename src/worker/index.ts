import { Hono, type Context } from "hono";
import {
  AUDIT_ACTIONS,
  auditLogs,
  formatTokyoTimestamp,
  isAuditAction,
  isAuditTimestamp,
  isIpv4,
  queryAuditLogs,
} from "../../data/auditLogs";

const app = new Hono();

const MAX_BODY_CHARS = 4096;
const ECHO_ID = "AL-ECHO";
const DEFAULT_IP = "192.0.2.1";

function respond(c: Context, body: unknown, status: 200 | 201 | 400 | 413) {
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
}

function requiredText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) return null;
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return null;
  return trimmed;
}

app.get("/api/audit-logs", (c) => {
  const action = c.req.query("action");
  const limitParam = c.req.query("limit");
  let limit: number | null = null;

  if (limitParam !== undefined) {
    if (!/^[1-9]\d*$/.test(limitParam)) {
      return respond(c, { error: "limit は 1 から 100 の整数で指定してください" }, 400);
    }
    limit = Number(limitParam);
    if (limit > 100) {
      return respond(c, { error: "limit は 1 から 100 の整数で指定してください" }, 400);
    }
  }

  const result = queryAuditLogs(auditLogs, { action, limit });
  const normalizedAction = action?.trim() ?? "";
  return respond(
    c,
    {
      logs: result.logs,
      totalCount: result.totalCount,
      limit: result.limit,
      action: normalizedAction === "" ? null : normalizedAction,
    },
    200,
  );
});

// 受け取った内容は共有メモリに残さない。応答に返すだけで、GET には出てこない。
app.post("/api/audit-logs", async (c) => {
  const raw = await c.req.text();
  if (raw.length > MAX_BODY_CHARS) {
    return respond(c, { error: "リクエストが大きすぎます" }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return respond(c, { error: "JSONの形式が正しくありません" }, 400);
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return respond(c, { error: "JSONオブジェクトを指定してください" }, 400);
  }

  const record = body as Record<string, unknown>;
  const actor = requiredText(record.actor, 200);
  const target = requiredText(record.target, 200);
  const detail = requiredText(record.detail, 500);
  if (!actor || !target || !detail || !isAuditAction(record.action)) {
    return respond(
      c,
      {
        error: `actor、action、target、detail は必須です。action は ${AUDIT_ACTIONS.join("、")} のいずれかです`,
      },
      400,
    );
  }

  let ipAddress = DEFAULT_IP;
  if (record.ipAddress !== undefined) {
    if (typeof record.ipAddress !== "string" || !isIpv4(record.ipAddress)) {
      return respond(c, { error: "ipAddress は IPv4 アドレスで指定してください" }, 400);
    }
    ipAddress = record.ipAddress;
  }

  let timestamp = formatTokyoTimestamp(new Date());
  if (record.timestamp !== undefined) {
    if (typeof record.timestamp !== "string" || !isAuditTimestamp(record.timestamp)) {
      return respond(
        c,
        { error: "timestamp は YYYY-MM-DDTHH:mm:ss+09:00 の形式で指定してください" },
        400,
      );
    }
    timestamp = record.timestamp;
  }

  return respond(
    c,
    {
      persisted: false,
      log: {
        id: ECHO_ID,
        timestamp,
        actor,
        action: record.action,
        target,
        ipAddress,
        detail,
      },
    },
    201,
  );
});

export default app;
