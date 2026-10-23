import { useSearchParams } from "react-router";
import UsersView from "@/components/UsersView";
import { users } from "@/data/users";

export default function UsersPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "cumulative" ? "cumulative" : "pagination";
  const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);

  return <UsersView allUsers={users} mode={mode} initialPage={initialPage} />;
}
