import { useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate, useSearchParams } from "react-router";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { recordLogin } from "@/hooks/useAuditLogStore";
import styles from "@/styles/layout.module.css";

export default function DashboardLayout() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const recorded = useRef(false);

  useEffect(() => {
    if (recorded.current || params.get("saml") !== "success") return;
    const nameId = params.get("nameId")?.trim();
    if (!nameId) return;
    recorded.current = true;
    recordLogin(nameId);
    if (location.pathname === "/settings/sso") return;
    const next = new URLSearchParams(params);
    next.delete("saml");
    next.delete("nameId");
    next.delete("signed");
    next.delete("issuer");
    next.delete("attr");
    const search = next.toString();
    navigate({ pathname: location.pathname, search: search === "" ? "" : `?${search}` }, { replace: true });
  }, [location.pathname, navigate, params]);

  return (
    <>
      <Header />
      <div className={styles.wrapper}>
        <Sidebar />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </>
  );
}
