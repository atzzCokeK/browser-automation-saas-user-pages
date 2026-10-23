import { Outlet } from "react-router";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import styles from "@/styles/layout.module.css";

export default function DashboardLayout() {
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
