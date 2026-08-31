"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import NotificationBar from "@/components/NotificationBar";
import { addUser } from "@/hooks/useUserStore";
import styles from "@/styles/user-new.module.css";

const departments = [
  "営業部",
  "開発部",
  "人事部",
  "経理部",
  "マーケティング部",
  "カスタマーサポート部",
];

const positions = ["一般社員", "主任", "係長", "課長", "部長"];

const permissions = [
  { value: "general", label: "一般" },
  { value: "admin", label: "管理者" },
  { value: "readonly", label: "閲覧のみ" },
];

function formatToday() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

export default function UserNewPage() {
  const router = useRouter();
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const lastName = String(formData.get("last_name") ?? "").trim();
    const firstName = String(formData.get("first_name") ?? "").trim();
    const department = String(formData.get("department") ?? "").trim();

    addUser({
      name: `${lastName} ${firstName}`.trim(),
      email: String(formData.get("email") ?? "").trim(),
      department: department === "" ? "-" : department,
      status: formData.get("status") === "無効" ? "無効" : "有効",
      createdAt: formatToday(),
    });

    setSuccess(true);
    setTimeout(() => {
      router.push("/users");
    }, 1000);
  };

  const handleCancel = () => {
    router.push("/users");
  };

  return (
    <section className={styles.page}>
      {success && <NotificationBar message="ユーザーを登録しました" />}

      <Link href="/users" className={styles.backLink}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M10.5 3L5.5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        ユーザー一覧に戻る
      </Link>

      <h1 className={styles.title}>ユーザー新規登録</h1>

      <div className={styles.card}>
        <form
          className={styles.form}
          onSubmit={handleSubmit}
          {...{
            toolname: "register_user",
            tooldescription:
              "Register a new user to the BtoB SaaS admin panel. Provide the user's personal information, department, role, and permissions.",
          }}
        >
          <div className={styles.field}>
            <label htmlFor="last_name" className={styles.label}>
              姓<span className={styles.required} aria-hidden="true">*</span>
            </label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              className={styles.input}
              required
              aria-required="true"
              autoComplete="family-name"
              {...{ toolparamdescription: "User's last name in Japanese (e.g. 田中)" }}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="first_name" className={styles.label}>
              名<span className={styles.required} aria-hidden="true">*</span>
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              className={styles.input}
              required
              aria-required="true"
              autoComplete="given-name"
              {...{ toolparamdescription: "User's first name in Japanese (e.g. 太郎)" }}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              メールアドレス<span className={styles.required} aria-hidden="true">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className={styles.input}
              required
              aria-required="true"
              autoComplete="email"
              {...{ toolparamdescription: "User's email address for login" }}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="department" className={styles.label}>
              部署
            </label>
            <select
              id="department"
              name="department"
              className={styles.select}
              defaultValue=""
              {...{ toolparamdescription: "Department the user belongs to. Options: 営業部, 開発部, 人事部, 経理部, マーケティング部, カスタマーサポート部. Optional." }}
            >
              <option value="">選択してください（任意）</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="position" className={styles.label}>
              役職
            </label>
            <select
              id="position"
              name="position"
              className={styles.select}
              defaultValue=""
              {...{ toolparamdescription: "Job title. Options: 一般社員, 主任, 係長, 課長, 部長. Optional." }}
            >
              <option value="">選択してください（任意）</option>
              {positions.map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="permission" className={styles.label}>
              権限レベル
            </label>
            <select
              id="permission"
              name="permission"
              className={styles.select}
              defaultValue=""
              {...{ toolparamdescription: "Permission level. Options: 一般 (general user), 管理者 (admin), 閲覧のみ (read-only). Optional." }}
            >
              <option value="">選択してください（任意）</option>
              {permissions.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <fieldset className={styles.field} style={{ border: "none", padding: 0 }}>
            <legend className={styles.label}>
              ステータス
            </legend>
            <div
              className={styles.radioGroup}
              {...{ toolparamdescription: "Account status: 有効 (active) or 無効 (inactive). Default: 有効. Optional." }}
            >
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="status"
                  value="有効"
                  defaultChecked
                />
                有効
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="status"
                  value="無効"
                />
                無効
              </label>
            </div>
          </fieldset>

          <div className={styles.field}>
            <label htmlFor="join_date" className={styles.label}>
              入社日
            </label>
            <input
              id="join_date"
              name="join_date"
              type="date"
              className={styles.input}
              {...{ toolparamdescription: "Date the user joined the company. Optional." }}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="notes" className={styles.label}>
              備考
            </label>
            <textarea
              id="notes"
              name="notes"
              className={styles.textarea}
              {...{ toolparamdescription: "Any additional notes about this user. Optional." }}
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={handleCancel}>
              キャンセル
            </button>
            <button type="submit" className={styles.submitButton} disabled={success}>
              登録する
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
