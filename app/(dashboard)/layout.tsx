import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import styles from "@/styles/layout.module.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <div className={styles.wrapper}>
        <Sidebar />
        <main className={styles.main}>{children}</main>
      </div>
    </>
  );
}
