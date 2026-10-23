import { Hono } from "hono";
import { auditLogs, queryAuditLogs } from "@/data/auditLogs";
import { users } from "@/data/users";
import { MAX_SAML_BYTES } from "@/src/saml/shared";
import { dispatchScim } from "@/src/worker/scim";
import {
  buildMetadata,
  consumeAssertionConsumer,
  createAuthnRequest,
  createPublicTestResponse,
  readBodyLimited,
} from "@/src/worker/saml";

const app = new Hono();

app.all("/api/scim/v2", dispatchScim);
app.all("/api/scim/v2/*", dispatchScim);

app.get("/api/health", (c) => {
  return c.json({ ok: true });
});

app.get("/api/users", async (c) => {
  // Artificial delay for demo purposes
  await new Promise((resolve) => setTimeout(resolve, 300));

  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 20));

  const totalCount = users.length;
  const totalPages = Math.ceil(totalCount / limit);
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const end = start + limit;
  const pageUsers = users.slice(start, end);

  return c.json({
    users: pageUsers,
    page: safePage,
    limit,
    totalCount,
    totalPages,
    hasMore: safePage < totalPages,
    hasPrevious: safePage > 1,
  });
});

// The previous Next.js route exported GET only, so other methods were 405.
// OPTIONS is answered by the local Workers runtime before it reaches this app.
app.on(["POST", "PUT", "PATCH", "DELETE"], "/api/users", (c) => {
  c.header("Allow", "GET, HEAD");
  return c.body(null, 405);
});

// 未指定や数値でない limit は全件。指定時は 1〜100 に丸める。
function parseAuditLimit(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(100, Math.max(1, Math.floor(parsed)));
}

app.get("/api/audit-logs", (c) => {
  // ブラウザのメモリに足した履歴は共有しない。どの訪問者にも同じシードを返す。
  const result = queryAuditLogs(auditLogs, {
    action: c.req.query("action"),
    limit: parseAuditLimit(c.req.query("limit")),
  });

  return c.json({
    logs: result.logs,
    totalCount: result.totalCount,
    limit: result.limit,
  });
});

app.on(["POST", "PUT", "PATCH", "DELETE"], "/api/audit-logs", (c) => {
  c.header("Allow", "GET, HEAD");
  return c.body(null, 405);
});

app.get("/api/saml/metadata", (c) => {
  c.header("Content-Type", "application/samlmetadata+xml; charset=utf-8");
  c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  return c.body(buildMetadata(new URL(c.req.url).origin));
});

app.post("/api/saml/acs", async (c) => {
  const location = await consumeAssertionConsumer({
    origin: new URL(c.req.url).origin,
    contentType: c.req.header("content-type") ?? "",
    cookie: c.req.header("cookie") ?? null,
    body: await readBodyLimited(c.req.raw, MAX_SAML_BYTES),
  });
  c.header("Cache-Control", "no-store");
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Content-Type-Options", "nosniff");
  return c.redirect(location, 303);
});

app.post("/api/saml/test-response", async (c) => {
  const result = await createPublicTestResponse({
    origin: new URL(c.req.url).origin,
    contentType: c.req.header("content-type") ?? "",
    body: await readBodyLimited(c.req.raw, MAX_SAML_BYTES),
  });
  c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  return c.json(result.body, result.status);
});

app.get("/api/saml/login", async (c) => {
  c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  return c.json(await createAuthnRequest(new URL(c.req.url).origin));
});

export default app;
