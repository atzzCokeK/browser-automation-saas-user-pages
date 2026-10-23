import type { Context } from "hono";
import { SCIM_BEARER_PATTERN } from "@/src/scimToken";

const USER_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User";
const ENTERPRISE_SCHEMA = "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User";
const SP_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig";
const SCHEMA_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:Schema";
const LIST_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:ListResponse";
const ERROR_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:Error";
const PATCH_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:PatchOp";
const PREFIX = "/api/scim/v2";

const MAX_USERS = 50;
const MAX_LOGS = 50;
const MAX_BUCKETS = 32;
const MAX_COUNT = 200;
const DEFAULT_COUNT = 100;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ScimName = {
  formatted: string;
  familyName: string;
  givenName: string;
};

type ScimEmail = {
  value: string;
  type: string;
  primary: boolean;
};

type ScimUser = {
  id: string;
  userName: string;
  name: ScimName;
  displayName: string;
  active: boolean;
  emails: ScimEmail[];
  department: string;
  title: string;
  created: string;
  lastModified: string;
};

type ScimLog = {
  method: string;
  path: string;
  status: number;
  timestamp: string;
  summary: string;
};

type Bucket = {
  users: ScimUser[];
  logs: ScimLog[];
};

type Failure = {
  ok: false;
  status: number;
  detail: string;
  scimType?: string;
};

type Success<T> = { ok: true; value: T };

type Result<T> = Success<T> | Failure;

type PatchOperation = {
  op: string;
  path?: string;
  value?: unknown;
};

// Per-token ring buffers. Nothing is written to a database or shared across tokens.
const buckets = new Map<string, Bucket>();

function touch(token: string): Bucket {
  const existing = buckets.get(token);
  if (existing) {
    buckets.delete(token);
    buckets.set(token, existing);
    return existing;
  }

  const created: Bucket = { users: [], logs: [] };
  buckets.set(token, created);
  while (buckets.size > MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined || oldest === token) break;
    buckets.delete(oldest);
  }
  return created;
}

function failure(detail: string, scimType?: string, status = 400): Failure {
  return { ok: false, status, detail, scimType };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clip(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function scimResponse(body: unknown, status: number, extra?: HeadersInit): Response {
  const headers = new Headers(extra);
  headers.set("Content-Type", "application/scim+json");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(JSON.stringify(body), { status, headers });
}

function errorBody(status: number, detail: string, scimType?: string): Record<string, unknown> {
  const body: Record<string, unknown> = {
    schemas: [ERROR_SCHEMA],
    status: String(status),
    detail,
  };
  if (scimType) body.scimType = scimType;
  return body;
}

function scimError(
  status: number,
  detail: string,
  scimType?: string,
  extra?: HeadersInit,
): Response {
  const headers = new Headers(extra);
  if (status === 401 && !headers.has("WWW-Authenticate")) {
    headers.set("WWW-Authenticate", 'Bearer realm="scim"');
  }
  return scimResponse(errorBody(status, detail, scimType), status, headers);
}

function logged(
  token: string,
  url: URL,
  method: string,
  status: number,
  summary: string,
  body: unknown | null,
  extra?: HeadersInit,
): Response {
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  if (pathname !== `${PREFIX}/logs`) {
    const bucket = touch(token);
    bucket.logs.unshift({
      method,
      path: clip(`${pathname}${url.search}`, 500),
      status,
      timestamp: new Date().toISOString(),
      summary: clip(summary, 200),
    });
    if (bucket.logs.length > MAX_LOGS) bucket.logs.length = MAX_LOGS;
  }

  if (status === 204) {
    const headers = new Headers(extra);
    headers.set("Cache-Control", "no-store");
    return new Response(null, { status: 204, headers });
  }

  return scimResponse(body, status, extra);
}

function loggedError(
  token: string,
  url: URL,
  method: string,
  status: number,
  detail: string,
  scimType?: string,
  extra?: HeadersInit,
): Response {
  const headers = new Headers(extra);
  if (status === 401) headers.set("WWW-Authenticate", 'Bearer realm="scim"');
  return logged(token, url, method, status, detail, errorBody(status, detail, scimType), headers);
}

function readBearer(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!match || !SCIM_BEARER_PATTERN.test(match[1])) return null;
  return match[1];
}

const BEARER_FORMAT_DETAIL =
  "Bearer の値は scim_test_token_ のあとに 16〜64 文字の英数字、_、- が続きます。"; // gitleaks:allow

function requireToken(c: Context): string | Response {
  const header = c.req.header("Authorization");
  if (!header) return scimError(401, `Bearer の値が必要です。${BEARER_FORMAT_DETAIL}`);
  const token = readBearer(header);
  if (!token) return scimError(401, `Bearer の形式が違います。${BEARER_FORMAT_DETAIL}`);
  return token;
}

function optionalToken(c: Context): string | null | Response {
  const header = c.req.header("Authorization");
  if (!header) return null;
  const token = readBearer(header);
  if (!token) return scimError(401, `Bearer の形式が違います。${BEARER_FORMAT_DETAIL}`);
  return token;
}

function cleanText(value: string, max: number): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return null;
  return trimmed;
}

function readOptionalText(value: unknown, field: string, max: number): Result<string> {
  if (value === undefined) return { ok: true, value: "" };
  if (typeof value !== "string") return failure(`${field} は文字列です`, "invalidValue");
  if (value.trim() === "") return { ok: true, value: "" };
  const cleaned = cleanText(value, max);
  if (!cleaned) {
    return failure(`${field} は 1〜${max} 文字で、制御文字は使えません`, "invalidValue");
  }
  return { ok: true, value: cleaned };
}

function parseName(value: unknown): Result<ScimName> {
  if (!isRecord(value)) return failure("name はオブジェクトです", "invalidValue");
  const familyName = readOptionalText(value.familyName, "name.familyName", 64);
  if (!familyName.ok) return familyName;
  const givenName = readOptionalText(value.givenName, "name.givenName", 64);
  if (!givenName.ok) return givenName;
  const formatted = readOptionalText(value.formatted, "name.formatted", 128);
  if (!formatted.ok) return formatted;
  return {
    ok: true,
    value: {
      familyName: familyName.value,
      givenName: givenName.value,
      formatted: formatted.value,
    },
  };
}

function parseEmails(value: unknown): Result<ScimEmail[]> {
  if (!Array.isArray(value)) return failure("emails は配列です", "invalidValue");
  if (value.length > 5) return failure("emails は 5 件までです", "invalidValue");
  const emails: ScimEmail[] = [];
  for (const item of value) {
    if (!isRecord(item)) return failure("emails の各要素はオブジェクトです", "invalidValue");
    if (typeof item.value !== "string") return failure("emails.value は文字列です", "invalidValue");
    const emailValue = cleanText(item.value, 128);
    if (!emailValue) return failure("emails.value は 1〜128 文字です", "invalidValue");
    if (item.type !== undefined && typeof item.type !== "string") {
      return failure("emails.type は文字列です", "invalidValue");
    }
    if (item.primary !== undefined && typeof item.primary !== "boolean") {
      return failure("emails.primary は真偽値です", "invalidValue");
    }
    const type = typeof item.type === "string" ? cleanText(item.type, 32) : "work";
    if (!type) return failure("emails.type は 1〜32 文字です", "invalidValue");
    emails.push({
      value: emailValue,
      type,
      primary: item.primary === true,
    });
  }
  if (emails.length > 0 && !emails.some((email) => email.primary)) emails[0].primary = true;
  return { ok: true, value: emails };
}

function readEnterprise(body: Record<string, unknown>): Result<{ department: string; title: string }> {
  const extension = body[ENTERPRISE_SCHEMA];
  const source = extension === undefined ? body : extension;
  if (extension !== undefined && !isRecord(extension)) {
    return failure("Enterprise User はオブジェクトです", "invalidValue");
  }
  const record = source as Record<string, unknown>;
  const department = readOptionalText(record.department, "department", 64);
  if (!department.ok) return department;
  const title = readOptionalText(record.title, "title", 64);
  if (!title.ok) return title;
  return { ok: true, value: { department: department.value, title: title.value } };
}

type ParsedUser = {
  userName: string;
  name: ScimName;
  displayName: string;
  active: boolean;
  emails: ScimEmail[];
  department: string;
  title: string;
};

function parseUserBody(body: unknown): Result<ParsedUser> {
  if (!isRecord(body)) return failure("JSON オブジェクトが必要です", "invalidSyntax");
  if (typeof body.userName !== "string") return failure("userName は必須の文字列です", "invalidValue");
  const userName = cleanText(body.userName, 128);
  if (!userName) return failure("userName は 1〜128 文字で、制御文字は使えません", "invalidValue");

  let name: ScimName = { formatted: "", familyName: "", givenName: "" };
  if (body.name !== undefined) {
    const parsedName = parseName(body.name);
    if (!parsedName.ok) return parsedName;
    name = parsedName.value;
  }

  const display = readOptionalText(body.displayName, "displayName", 128);
  if (!display.ok) return display;
  if (body.active !== undefined && typeof body.active !== "boolean") {
    return failure("active は真偽値です", "invalidValue");
  }

  let emails: ScimEmail[] = [];
  if (body.emails !== undefined) {
    const parsedEmails = parseEmails(body.emails);
    if (!parsedEmails.ok) return parsedEmails;
    emails = parsedEmails.value;
  } else if (userName.includes("@")) {
    emails = [{ value: userName, type: "work", primary: true }];
  }

  const enterprise = readEnterprise(body);
  if (!enterprise.ok) return enterprise;

  const joined = [name.familyName, name.givenName].filter(Boolean).join(" ");
  if (!name.formatted && joined) name = { ...name, formatted: joined };
  const displayName = display.value || name.formatted || joined || userName;

  return {
    ok: true,
    value: {
      userName,
      name,
      displayName,
      active: body.active !== false,
      emails,
      department: enterprise.value.department,
      title: enterprise.value.title,
    },
  };
}

function userNameTaken(bucket: Bucket, userName: string, exceptId?: string): boolean {
  const key = userName.toLowerCase();
  return bucket.users.some(
    (user) => user.id !== exceptId && user.userName.toLowerCase() === key,
  );
}

function toResource(user: ScimUser, origin: string): Record<string, unknown> {
  const schemas = [USER_SCHEMA];
  const name: Record<string, string> = {};
  if (user.name.formatted) name.formatted = user.name.formatted;
  if (user.name.familyName) name.familyName = user.name.familyName;
  if (user.name.givenName) name.givenName = user.name.givenName;

  const resource: Record<string, unknown> = {
    schemas,
    id: user.id,
    userName: user.userName,
    active: user.active,
    meta: {
      resourceType: "User",
      created: user.created,
      lastModified: user.lastModified,
      location: `${origin}${PREFIX}/Users/${user.id}`,
    },
  };
  if (Object.keys(name).length > 0) resource.name = name;
  if (user.displayName) resource.displayName = user.displayName;
  if (user.emails.length > 0) resource.emails = user.emails;
  if (user.department || user.title) {
    schemas.push(ENTERPRISE_SCHEMA);
    const enterprise: Record<string, string> = {};
    if (user.department) enterprise.department = user.department;
    if (user.title) enterprise.title = user.title;
    resource[ENTERPRISE_SCHEMA] = enterprise;
  }
  return resource;
}

function cloneUser(user: ScimUser): ScimUser {
  return {
    ...user,
    name: { ...user.name },
    emails: user.emails.map((email) => ({ ...email })),
  };
}

function isEnterpriseKey(key: string): boolean {
  return key.trim().toLowerCase() === ENTERPRISE_SCHEMA.toLowerCase();
}

function knownAttribute(key: string): boolean {
  const lower = key.trim().toLowerCase();
  return (
    lower === "username" ||
    lower === "name" ||
    lower === "name.givenname" ||
    lower === "name.familyname" ||
    lower === "name.formatted" ||
    lower === "displayname" ||
    lower === "active" ||
    lower === "emails" ||
    lower === "department" ||
    lower === "title" ||
    lower === `${ENTERPRISE_SCHEMA.toLowerCase()}:department` ||
    lower === `${ENTERPRISE_SCHEMA.toLowerCase()}:title` ||
    isEnterpriseKey(key)
  );
}

function applyNamePart(
  user: ScimUser,
  field: keyof ScimName,
  value: unknown,
  mode: "add" | "replace" | "remove",
): Failure | null {
  if (mode === "remove") {
    user.name[field] = "";
    return null;
  }
  const text = readOptionalText(value, `name.${field}`, field === "formatted" ? 128 : 64);
  if (!text.ok) return text;
  user.name[field] = text.value;
  return null;
}

function applyEnterpriseObject(
  user: ScimUser,
  value: unknown,
  mode: "add" | "replace" | "remove",
): Failure | null {
  if (mode === "remove") {
    user.department = "";
    user.title = "";
    return null;
  }
  if (!isRecord(value)) return failure("Enterprise User はオブジェクトです", "invalidValue");
  if (mode === "replace" || value.department !== undefined) {
    const department = readOptionalText(value.department, "department", 64);
    if (!department.ok) return department;
    user.department = department.value;
  }
  if (mode === "replace" || value.title !== undefined) {
    const title = readOptionalText(value.title, "title", 64);
    if (!title.ok) return title;
    user.title = title.value;
  }
  return null;
}

function applyAttribute(
  user: ScimUser,
  key: string,
  value: unknown,
  mode: "add" | "replace" | "remove",
): Failure | null {
  const lower = key.trim().toLowerCase();
  const enterprise = ENTERPRISE_SCHEMA.toLowerCase();

  if (lower === "department" || lower === `${enterprise}:department`) {
    if (mode === "remove") {
      user.department = "";
      return null;
    }
    const text = readOptionalText(value, "department", 64);
    if (!text.ok) return text;
    user.department = text.value;
    return null;
  }

  if (lower === "title" || lower === `${enterprise}:title`) {
    if (mode === "remove") {
      user.title = "";
      return null;
    }
    const text = readOptionalText(value, "title", 64);
    if (!text.ok) return text;
    user.title = text.value;
    return null;
  }

  if (isEnterpriseKey(key)) return applyEnterpriseObject(user, value, mode);

  if (lower === "active") {
    if (mode === "remove") return failure("active は削除できません", "mutability");
    if (typeof value !== "boolean") return failure("active は真偽値です", "invalidValue");
    user.active = value;
    return null;
  }

  if (lower === "username") {
    if (mode === "remove") return failure("userName は削除できません", "mutability");
    if (typeof value !== "string") return failure("userName は文字列です", "invalidValue");
    const userName = cleanText(value, 128);
    if (!userName) return failure("userName は 1〜128 文字で、制御文字は使えません", "invalidValue");
    user.userName = userName;
    return null;
  }

  if (lower === "displayname") {
    if (mode === "remove") {
      user.displayName = "";
      return null;
    }
    const text = readOptionalText(value, "displayName", 128);
    if (!text.ok) return text;
    user.displayName = text.value;
    return null;
  }

  if (lower === "name") {
    if (mode === "remove") {
      user.name = { formatted: "", familyName: "", givenName: "" };
      return null;
    }
    const parsed = parseName(value);
    if (!parsed.ok) return parsed;
    if (mode === "add") {
      if (parsed.value.familyName) user.name.familyName = parsed.value.familyName;
      if (parsed.value.givenName) user.name.givenName = parsed.value.givenName;
      if (parsed.value.formatted) user.name.formatted = parsed.value.formatted;
    } else {
      user.name = parsed.value;
    }
    if (!user.name.formatted) {
      const joined = [user.name.familyName, user.name.givenName].filter(Boolean).join(" ");
      if (joined) user.name.formatted = joined;
    }
    return null;
  }

  if (lower === "name.givenname") return applyNamePart(user, "givenName", value, mode);
  if (lower === "name.familyname") return applyNamePart(user, "familyName", value, mode);
  if (lower === "name.formatted") return applyNamePart(user, "formatted", value, mode);

  if (lower === "emails") {
    if (mode === "remove") {
      user.emails = [];
      return null;
    }
    if (mode === "add" && isRecord(value)) {
      const parsed = parseEmails([value]);
      if (!parsed.ok) return parsed;
      user.emails = [...user.emails, ...parsed.value].slice(0, 5);
      return null;
    }
    const parsed = parseEmails(value);
    if (!parsed.ok) return parsed;
    user.emails = mode === "add" ? [...user.emails, ...parsed.value].slice(0, 5) : parsed.value;
    return null;
  }

  return failure("この path には対応していません", "invalidPath");
}

function applyMap(
  user: ScimUser,
  value: unknown,
  mode: "add" | "replace",
): Failure | null {
  if (!isRecord(value)) return failure("value はオブジェクトです", "invalidValue");
  for (const [key, item] of Object.entries(value)) {
    if (!knownAttribute(key)) continue;
    const applied = applyAttribute(user, key, item, mode);
    if (applied) return applied;
  }
  return null;
}

function parsePatch(body: unknown): Result<PatchOperation[]> {
  if (!isRecord(body)) return failure("JSON オブジェクトが必要です", "invalidSyntax");
  if (body.schemas !== undefined) {
    if (
      !Array.isArray(body.schemas) ||
      !body.schemas.every((item) => typeof item === "string") ||
      !body.schemas.includes(PATCH_SCHEMA)
    ) {
      return failure("schemas に PatchOp が必要です", "invalidValue");
    }
  }
  if (!Array.isArray(body.Operations) || body.Operations.length === 0) {
    return failure("Operations が必要です", "invalidValue");
  }
  if (body.Operations.length > 20) return failure("Operations は 20 件までです", "tooMany");

  const operations: PatchOperation[] = [];
  for (const item of body.Operations) {
    if (!isRecord(item) || typeof item.op !== "string" || item.op.trim() === "") {
      return failure("各 Operation に op が必要です", "invalidValue");
    }
    if (item.path !== undefined && typeof item.path !== "string") {
      return failure("path は文字列です", "invalidPath");
    }
    operations.push({
      op: item.op,
      path: typeof item.path === "string" ? item.path : undefined,
      value: item.value,
    });
  }
  return { ok: true, value: operations };
}

function applyOperations(user: ScimUser, operations: PatchOperation[]): Failure | null {
  for (const operation of operations) {
    const op = operation.op.trim().toLowerCase();
    if (op !== "add" && op !== "replace" && op !== "remove") {
      return failure("op は add、replace、remove です", "invalidValue");
    }
    if (operation.path?.includes("[")) {
      return failure("この path には対応していません", "invalidPath");
    }
    if (!operation.path) {
      if (op === "remove") return failure("remove には path が必要です", "invalidPath");
      const applied = applyMap(user, operation.value, op);
      if (applied) return applied;
      continue;
    }
    const applied = applyAttribute(user, operation.path, operation.value, op);
    if (applied) return applied;
  }
  return null;
}

function isJsonContentType(value: string | undefined): boolean {
  if (!value) return false;
  const media = value.split(";", 1)[0]?.trim().toLowerCase();
  return media === "application/scim+json" || media === "application/json";
}

async function readJson(c: Context): Promise<Result<unknown>> {
  if (!isJsonContentType(c.req.header("Content-Type"))) {
    return failure(
      "Content-Type は application/scim+json または application/json です",
      "invalidSyntax",
    );
  }
  const raw = await c.req.text();
  if (raw.length > 65536) {
    return failure("リクエストボディは 65536 文字までです", "invalidSyntax");
  }
  if (raw.trim() === "") return failure("リクエストボディが空です", "invalidSyntax");
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return failure("JSON として解釈できません", "invalidSyntax");
  }
}

function readQueryInt(value: string | null): number | Failure {
  if (value === null || value === "") return failure("数が空です", "invalidValue");
  if (!/^\d+$/.test(value)) return failure("startIndex と count は 0 以上の整数です", "invalidValue");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    return failure("startIndex と count は 0 以上の整数です", "invalidValue");
  }
  return parsed;
}

function parseFilter(filter: string): Result<string> {
  const match = /^userName\s+eq\s+"([^"]*)"\s*$/i.exec(filter);
  if (!match) {
    return failure('filter は userName eq "..." だけに対応しています', "invalidFilter");
  }
  if (match[1].length > 128) return failure("filter の userName が長すぎます", "invalidFilter");
  return { ok: true, value: match[1] };
}

function findUser(bucket: Bucket, id: string): ScimUser | undefined {
  return bucket.users.find((user) => user.id === id);
}

function replaceUser(bucket: Bucket, user: ScimUser) {
  bucket.users = bucket.users.map((item) => (item.id === user.id ? user : item));
}

function userLocation(origin: string, id: string): string {
  return `${origin}${PREFIX}/Users/${id}`;
}

function resultToResponse(
  token: string,
  url: URL,
  method: string,
  result: Failure,
): Response {
  return loggedError(token, url, method, result.status, result.detail, result.scimType);
}

type SchemaAttribute = {
  name: string;
  type: "string" | "boolean" | "complex";
  multiValued: boolean;
  description: string;
  required: boolean;
  caseExact: boolean;
  mutability: "readWrite" | "readOnly";
  returned: "default";
  uniqueness: "none" | "server";
  subAttributes?: SchemaAttribute[];
};

function attribute(
  name: string,
  type: SchemaAttribute["type"],
  description: string,
  extras: {
    multiValued?: boolean;
    required?: boolean;
    mutability?: SchemaAttribute["mutability"];
    uniqueness?: SchemaAttribute["uniqueness"];
    subAttributes?: SchemaAttribute[];
  } = {},
): SchemaAttribute {
  return {
    name,
    type,
    multiValued: extras.multiValued ?? false,
    description,
    required: extras.required ?? false,
    caseExact: false,
    mutability: extras.mutability ?? "readWrite",
    returned: "default",
    uniqueness: extras.uniqueness ?? "none",
    ...(extras.subAttributes ? { subAttributes: extras.subAttributes } : {}),
  };
}

function schemaDocument(origin: string, id: string) {
  const shared = {
    schemas: [SCHEMA_SCHEMA],
    meta: {
      resourceType: "Schema",
      location: `${origin}${PREFIX}/Schemas/${encodeURIComponent(id)}`,
    },
  };

  if (id === USER_SCHEMA) {
    return {
      ...shared,
      id,
      name: "User",
      description: "ダミー SCIM ユーザー",
      attributes: [
        attribute("userName", "string", "ログイン名", { required: true, uniqueness: "server" }),
        attribute("name", "complex", "氏名", {
          subAttributes: [
            attribute("formatted", "string", "表示用の氏名"),
            attribute("familyName", "string", "姓"),
            attribute("givenName", "string", "名"),
          ],
        }),
        attribute("displayName", "string", "表示名"),
        attribute("active", "boolean", "有効かどうか"),
        attribute("emails", "complex", "メールアドレス", {
          multiValued: true,
          subAttributes: [
            attribute("value", "string", "メールアドレス"),
            attribute("type", "string", "種別"),
            attribute("primary", "boolean", "主アドレス"),
          ],
        }),
      ],
    };
  }

  if (id === ENTERPRISE_SCHEMA) {
    return {
      ...shared,
      id,
      name: "EnterpriseUser",
      description: "部署と役職",
      attributes: [
        attribute("department", "string", "部署"),
        attribute("title", "string", "役職"),
      ],
    };
  }

  return null;
}

function serviceProviderConfig(origin: string) {
  return {
    schemas: [SP_SCHEMA],
    documentationUri: "https://datatracker.ietf.org/doc/html/rfc7644",
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: MAX_COUNT },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [
      {
        type: "oauthbearertoken",
        name: "OAuth Bearer Token",
        description: BEARER_FORMAT_DETAIL,
        specUri: "https://www.rfc-editor.org/info/rfc6750",
        primary: true,
      },
    ],
    meta: {
      resourceType: "ServiceProviderConfig",
      location: `${origin}${PREFIX}/ServiceProviderConfig`,
    },
  };
}

function methodNotAllowed(
  token: string | null,
  url: URL,
  method: string,
  allow: string,
): Response {
  const headers = { Allow: allow };
  if (!token) return scimError(405, "メソッドは許可されていません", undefined, headers);
  return loggedError(token, url, method, 405, "メソッドは許可されていません", undefined, headers);
}

async function handleUsers(
  c: Context,
  url: URL,
  method: string,
  token: string,
  id: string | null,
): Promise<Response> {
  const bucket = touch(token);
  const origin = url.origin;

  if (id === null && method === "GET") {
    if (url.searchParams.has("sortBy") || url.searchParams.has("sortOrder")) {
      return loggedError(token, url, method, 400, "sort には対応していません", "invalidValue");
    }

    const startRaw = url.searchParams.get("startIndex");
    const countRaw = url.searchParams.get("count");
    let startIndex = 1;
    if (startRaw !== null) {
      const parsed = readQueryInt(startRaw);
      if (typeof parsed !== "number") return resultToResponse(token, url, method, parsed);
      startIndex = Math.max(1, parsed);
    }
    let count = DEFAULT_COUNT;
    if (countRaw !== null) {
      const parsed = readQueryInt(countRaw);
      if (typeof parsed !== "number") return resultToResponse(token, url, method, parsed);
      count = Math.min(MAX_COUNT, parsed);
    }

    let filtered = bucket.users;
    const filter = url.searchParams.get("filter");
    if (filter !== null) {
      const parsed = parseFilter(filter);
      if (!parsed.ok) return resultToResponse(token, url, method, parsed);
      const expected = parsed.value.toLowerCase();
      filtered = bucket.users.filter((user) => user.userName.toLowerCase() === expected);
    }

    const start = startIndex - 1;
    const page = filtered.slice(start, start + count);
    const summary = filter
      ? `userName で検索しました (${filtered.length} 件)`
      : `ユーザー一覧を取得しました (${filtered.length} 件)`;
    return logged(token, url, method, 200, summary, {
      schemas: [LIST_SCHEMA],
      totalResults: filtered.length,
      startIndex,
      itemsPerPage: page.length,
      Resources: page.map((user) => toResource(user, origin)),
    });
  }

  if (id === null && method === "POST") {
    const body = await readJson(c);
    if (!body.ok) return resultToResponse(token, url, method, body);
    const parsed = parseUserBody(body.value);
    if (!parsed.ok) return resultToResponse(token, url, method, parsed);
    if (userNameTaken(bucket, parsed.value.userName)) {
      return loggedError(
        token,
        url,
        method,
        409,
        "userName は一意である必要があります",
        "uniqueness",
      );
    }
    const now = new Date().toISOString();
    const user: ScimUser = {
      ...parsed.value,
      id: crypto.randomUUID(),
      created: now,
      lastModified: now,
    };
    if (bucket.users.length >= MAX_USERS) bucket.users.shift();
    bucket.users.push(user);
    return logged(
      token,
      url,
      method,
      201,
      `ユーザーを作成しました: ${user.userName}`,
      toResource(user, origin),
      { Location: userLocation(origin, user.id) },
    );
  }

  if (!id || !UUID_RE.test(id)) {
    return loggedError(token, url, method, 404, "ユーザーが見つかりません");
  }

  const current = findUser(bucket, id);
  if (!current) return loggedError(token, url, method, 404, "ユーザーが見つかりません");

  if (method === "GET") {
    return logged(
      token,
      url,
      method,
      200,
      `ユーザーを取得しました: ${current.userName}`,
      toResource(current, origin),
    );
  }

  if (method === "DELETE") {
    bucket.users = bucket.users.filter((user) => user.id !== id);
    return logged(token, url, method, 204, `ユーザーを削除しました: ${current.userName}`, null);
  }

  const body = await readJson(c);
  if (!body.ok) return resultToResponse(token, url, method, body);

  if (method === "PUT") {
    if (isRecord(body.value) && typeof body.value.id === "string" && body.value.id !== id) {
      return loggedError(token, url, method, 400, "id は変更できません", "mutability");
    }
    const parsed = parseUserBody(body.value);
    if (!parsed.ok) return resultToResponse(token, url, method, parsed);
    if (userNameTaken(bucket, parsed.value.userName, id)) {
      return loggedError(
        token,
        url,
        method,
        409,
        "userName は一意である必要があります",
        "uniqueness",
      );
    }
    const next: ScimUser = {
      ...parsed.value,
      id,
      created: current.created,
      lastModified: new Date().toISOString(),
    };
    replaceUser(bucket, next);
    return logged(
      token,
      url,
      method,
      200,
      `ユーザーを置き換えました: ${next.userName}`,
      toResource(next, origin),
    );
  }

  const patch = parsePatch(body.value);
  if (!patch.ok) return resultToResponse(token, url, method, patch);
  const next = cloneUser(current);
  const applied = applyOperations(next, patch.value);
  if (applied) return resultToResponse(token, url, method, applied);
  if (userNameTaken(bucket, next.userName, id)) {
    return loggedError(token, url, method, 409, "userName は一意である必要があります", "uniqueness");
  }
  if (!next.displayName) {
    next.displayName =
      next.name.formatted ||
      [next.name.familyName, next.name.givenName].filter(Boolean).join(" ") ||
      next.userName;
  }
  next.lastModified = new Date().toISOString();
  replaceUser(bucket, next);
  const summary =
    current.active && !next.active
      ? `ユーザーを無効化しました: ${next.userName}`
      : `ユーザーを更新しました: ${next.userName}`;
  return logged(token, url, method, 200, summary, toResource(next, origin));
}

function listResponse(resources: unknown[]) {
  return {
    schemas: [LIST_SCHEMA],
    totalResults: resources.length,
    startIndex: 1,
    itemsPerPage: resources.length,
    Resources: resources,
  };
}

async function routeScim(c: Context, url: URL, rest: string, method: string): Promise<Response> {
  const userId = rest.startsWith("/Users/") ? rest.slice("/Users/".length) : null;
  const schemaId = rest.startsWith("/Schemas/") ? rest.slice("/Schemas/".length) : null;

  if (rest === "/ServiceProviderConfig") {
    const token = optionalToken(c);
    if (token instanceof Response) return token;
    if (method !== "GET") return methodNotAllowed(token, url, method, "GET, HEAD");
    const body = serviceProviderConfig(url.origin);
    if (!token) return scimResponse(body, 200);
    return logged(token, url, method, 200, "ServiceProviderConfig を取得しました", body);
  }

  if (rest === "/Schemas" || (schemaId !== null && !schemaId.includes("/"))) {
    const token = optionalToken(c);
    if (token instanceof Response) return token;
    if (method !== "GET") return methodNotAllowed(token, url, method, "GET, HEAD");
    if (rest === "/Schemas") {
      const resources = [USER_SCHEMA, ENTERPRISE_SCHEMA]
        .map((id) => schemaDocument(url.origin, id))
        .filter((item) => item !== null);
      const body = listResponse(resources);
      if (!token) return scimResponse(body, 200);
      return logged(token, url, method, 200, "Schemas を取得しました", body);
    }
    const document = schemaDocument(url.origin, schemaId ?? "");
    if (!document) {
      const missing = scimError(404, "スキーマが見つかりません");
      if (!token) return missing;
      return loggedError(token, url, method, 404, "スキーマが見つかりません");
    }
    if (!token) return scimResponse(document, 200);
    return logged(token, url, method, 200, "スキーマを取得しました", document);
  }

  if (rest === "/logs") {
    const token = requireToken(c);
    if (typeof token !== "string") return token;
    if (method !== "GET") return methodNotAllowed(token, url, method, "GET, HEAD");
    const bucket = touch(token);
    return scimResponse(listResponse(bucket.logs), 200);
  }

  if (rest === "/Users" || (userId !== null && !userId.includes("/"))) {
    const token = requireToken(c);
    if (typeof token !== "string") return token;
    const allowed = rest === "/Users" ? "GET, POST, HEAD" : "GET, PUT, PATCH, DELETE, HEAD";
    const permitted =
      rest === "/Users"
        ? method === "GET" || method === "POST"
        : method === "GET" || method === "PUT" || method === "PATCH" || method === "DELETE";
    if (!permitted) return methodNotAllowed(token, url, method, allowed);
    return handleUsers(c, url, method, token, rest === "/Users" ? null : userId);
  }

  return scimError(404, "SCIM リソースが見つかりません");
}

export async function dispatchScim(c: Context): Promise<Response> {
  const url = new URL(c.req.url);
  if (url.search.length > 2048) {
    return scimError(400, "クエリ文字列が長すぎます", "invalidValue");
  }

  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  if (pathname !== PREFIX && !pathname.startsWith(`${PREFIX}/`)) {
    return scimError(404, "SCIM リソースが見つかりません");
  }

  const original = c.req.method.toUpperCase();
  const method = original === "HEAD" ? "GET" : original;
  const response = await routeScim(c, url, pathname.slice(PREFIX.length) || "/", method);
  if (original !== "HEAD") return response;
  return new Response(null, { status: response.status, headers: response.headers });
}
