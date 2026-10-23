import type { NextRequest } from "next/server";
import app from "@/src/worker";

// 監査ログ API の実装は Hono ワーカー。ここは同じオリジンへ届ける入口。
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return app.fetch(request);
}

export function POST(request: NextRequest) {
  return app.fetch(request);
}
