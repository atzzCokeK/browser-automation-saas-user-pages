import type { Metadata } from "next";
import AuditLogView from "@/components/AuditLogView";

export const metadata: Metadata = {
  title: "監査ログ - SaaS Admin",
};

export default function AuditLogsPage() {
  return <AuditLogView />;
}
