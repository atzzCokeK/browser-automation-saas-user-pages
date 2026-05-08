import { type NextRequest } from "next/server";
import { users } from "@/data/users";

export async function GET(request: NextRequest) {
  // Artificial delay for demo purposes
  await new Promise((resolve) => setTimeout(resolve, 300));

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));

  const totalCount = users.length;
  const totalPages = Math.ceil(totalCount / limit);
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const end = start + limit;
  const pageUsers = users.slice(start, end);

  return Response.json({
    users: pageUsers,
    page: safePage,
    limit,
    totalCount,
    totalPages,
    hasMore: safePage < totalPages,
    hasPrevious: safePage > 1,
  });
}
