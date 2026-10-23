import { Navigate, Route, Routes } from "react-router";
import DashboardLayout from "@/src/layouts/DashboardLayout";
import AuditLogsPage from "@/src/pages/AuditLogsPage";
import DashboardPage from "@/src/pages/DashboardPage";
import LoginPage from "@/src/pages/LoginPage";
import SsoSettingsPage from "@/src/pages/SsoSettingsPage";
import UserDetailPage from "@/src/pages/UserDetailPage";
import UserNewPage from "@/src/pages/UserNewPage";
import UsersPage from "@/src/pages/UsersPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/new" element={<UserNewPage />} />
        <Route path="/users/:id" element={<UserDetailPage />} />
        <Route path="/audit-logs" element={<AuditLogsPage />} />
        <Route path="/settings/sso" element={<SsoSettingsPage />} />
      </Route>
    </Routes>
  );
}
