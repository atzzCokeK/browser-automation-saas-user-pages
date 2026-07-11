"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
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

const webmcpSampleCode = `<form
  toolname="register_user"
  tooldescription="Register a new user to the BtoB SaaS
    admin panel. Provide the user's personal
    information, department, role, and permissions.">

  <input name="last_name"
    toolparamdescription="User's last name in Japanese
      (e.g. 田中)" />

  <input name="first_name"
    toolparamdescription="User's first name in Japanese
      (e.g. 太郎)" />

  <input name="email" type="email"
    toolparamdescription="User's email address for login" />

  <select name="department"
    toolparamdescription="Department the user belongs to.
      Options: 営業部, 開発部, 人事部, 経理部,
      マーケティング部, カスタマーサポート部" />

  <select name="permission"
    toolparamdescription="Permission level.
      Options: 一般 (general user),
      管理者 (admin), 閲覧のみ (read-only)" />

  <input name="status" type="radio"
    toolparamdescription="Account status:
      有効 (active) or 無効 (inactive).
      Default: 有効" />
</form>`;

export default function UserNewPage() {
  const router = useRouter();
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSuccess(true);
    setTimeout(() => {
      router.push("/users");
    }, 3000);
  };

  const handleCancel = () => {
    router.push("/users");
  };

  return (
    <section className={styles.page}>
      <Link href="/users" className={styles.backLink}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M10.5 3L5.5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        ユーザー一覧に戻る
      </Link>

      <h1 className={styles.title}>ユーザー新規登録</h1>

      {success && (
        <div className={styles.successBanner} role="alert">
          ユーザーを登録しました（デモ）。3秒後にユーザー一覧へ移動します…
        </div>
      )}

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
              部署<span className={styles.required} aria-hidden="true">*</span>
            </label>
            <select
              id="department"
              name="department"
              className={styles.select}
              required
              aria-required="true"
              defaultValue=""
              {...{ toolparamdescription: "Department the user belongs to. Options: 営業部, 開発部, 人事部, 経理部, マーケティング部, カスタマーサポート部" }}
            >
              <option value="" disabled>選択してください</option>
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
              権限レベル<span className={styles.required} aria-hidden="true">*</span>
            </label>
            <select
              id="permission"
              name="permission"
              className={styles.select}
              required
              aria-required="true"
              defaultValue=""
              {...{ toolparamdescription: "Permission level. Options: 一般 (general user), 管理者 (admin), 閲覧のみ (read-only)" }}
            >
              <option value="" disabled>選択してください</option>
              {permissions.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <fieldset className={styles.field} style={{ border: "none", padding: 0 }}>
            <legend className={styles.label}>
              ステータス<span className={styles.required} aria-hidden="true">*</span>
            </legend>
            <div
              className={styles.radioGroup}
              {...{ toolparamdescription: "Account status: 有効 (active) or 無効 (inactive). Default: 有効" }}
            >
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="status"
                  value="有効"
                  defaultChecked
                  required
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

      <div className={styles.webmcpSection}>
        <h2 className={styles.webmcpTitle}>WebMCP 属性リファレンス</h2>
        <p className={styles.webmcpDesc}>
          このフォームには以下の WebMCP 宣言型属性が付与されています。
          対応ブラウザ上の AI エージェントがこのフォームをツールとして認識し、自動入力できます。
        </p>
        <pre className={styles.codeBlock}>{webmcpSampleCode}</pre>
        <p className={styles.webmcpNote}>
          <span className={styles.webmcpBadge}>Origin Trial</span>
          対応ブラウザ: Google Chrome（オリジントライアル段階）
        </p>
      </div>
    </section>
  );
}
