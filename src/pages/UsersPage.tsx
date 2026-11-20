import { useSearchParams } from "react-router";
import { parseDetail } from "@/components/DetailSwitcher";
import UsersView from "@/components/UsersView";
import { users } from "@/data/users";

const LIST_MODES = ["pagination", "cumulative", "load-more"] as const;

export default function UsersPage() {
  const [searchParams] = useSearchParams();
  const mode = LIST_MODES.find((listMode) => listMode === searchParams.get("mode")) ?? "pagination";
  const detail = parseDetail(searchParams);
  const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);

  return <UsersView allUsers={users} mode={mode} detail={detail} initialPage={initialPage} />;
}
