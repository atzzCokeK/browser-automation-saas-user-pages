import { Hono } from "hono";
import { users } from "@/data/users";

const app = new Hono();

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

export default app;
