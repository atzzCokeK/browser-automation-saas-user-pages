import { type NextRequest } from "next/server";
import { auditLogs, queryAuditLogs } from "@/data/auditLogs";

// 1〜100 に丸める。未指定や数値でないときは全件。
function parseLimit(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(100, Math.max(1, Math.floor(parsed)));
}

export async function GET(request: NextRequest) {
  // ブラウザのメモリに足した履歴は共有しない。どの訪問者にも同じシードを返す。
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");
  const limit = parseLimit(searchParams.get("limit"));
  const result = queryAuditLogs(auditLogs, { action, limit });

  return Response.json({
    logs: result.logs,
    totalCount: result.totalCount,
    limit: result.limit,
  });
}
