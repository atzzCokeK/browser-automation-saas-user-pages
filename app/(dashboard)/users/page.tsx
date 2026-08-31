import { users } from "@/data/users";
import UsersView from "@/components/UsersView";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; mode?: string }>;
}) {
  const { page, mode } = await searchParams;
  const displayMode = mode === "cumulative" ? "cumulative" : "pagination";
  const initialPage = Math.max(1, Number(page) || 1);

  return (
    <UsersView allUsers={users} mode={displayMode} initialPage={initialPage} />
  );
}
