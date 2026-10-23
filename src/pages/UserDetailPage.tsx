import { Link, useNavigate, useParams } from "react-router";
import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  departments,
  isUserPermission,
  permissionOptions,
  positions,
  type User,
} from "@/data/users";
import { recordUserDelete, recordUserEdit } from "@/hooks/useAuditLogStore";
import { deleteUser, findUser, setNotification, updateUser, useUserStore } from "@/hooks/useUserStore";
import formStyles from "@/styles/user-new.module.css";
import styles from "@/styles/user-detail.module.css";

function splitUserName(name: string): { lastName: string; firstName: string } {
  const trimmed = name.trim();
  const space = trimmed.indexOf(" ");
  if (space === -1) return { lastName: trimmed, firstName: "" };
  return {
    lastName: trimmed.slice(0, space),
    firstName: trimmed.slice(space + 1).trim(),
  };
}

function listedValue(options: readonly string[], value: string): string {
  return options.includes(value) ? value : "";
}

function UserNotFound() {
  return (
    <section className={formStyles.page}>
      <Link to="/users" className={formStyles.backLink}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M10.5 3L5.5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        一覧へ戻る
      </Link>
      <h1 className={styles.notFoundTitle}>ユーザーが見つかりません</h1>
      <p className={styles.notFoundText}>
        指定されたユーザーは存在しないか、すでに削除されています。
      </p>
    </section>
  );
}

function UserDetailForm({ user }: { user: User }) {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { lastName, firstName } = splitUserName(user.name);
  const departmentValue = listedValue(departments, user.department);
  const positionValue = listedValue(positions, user.position);
  const permissionValue = isUserPermission(user.permission) ? user.permission : "";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const nextLastName = String(formData.get("last_name") ?? "").trim();
    const nextFirstName = String(formData.get("first_name") ?? "").trim();
    const department = String(formData.get("department") ?? "").trim();
    const permissionRaw = String(formData.get("permission") ?? "").trim();
    const name = `${nextLastName} ${nextFirstName}`.trim();
    const nextUser: Omit<User, "id" | "createdAt"> = {
      name,
      email: String(formData.get("email") ?? "").trim(),
      department: department === "" ? "-" : department,
      position: String(formData.get("position") ?? "").trim(),
      permission: isUserPermission(permissionRaw) ? permissionRaw : "",
      status: formData.get("status") === "無効" ? "無効" : "有効",
      joinDate: String(formData.get("join_date") ?? "").trim(),
      notes: String(formData.get("notes") ?? "").trim(),
    };

    updateUser(user.id, nextUser);
    recordUserEdit(user, nextUser);

    setNotification(`${name} の情報を更新しました`);
    setSubmitted(true);
    navigate("/users");
  };

  const handleConfirmDelete = () => {
    deleteUser(user.id);
    recordUserDelete(user.name, user.email);
    setNotification(`${user.name} を削除しました`);
    setConfirmOpen(false);
    navigate("/users");
  };

  const handleCancelDelete = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  return (
    <section className={formStyles.page}>
      <Link to="/users" className={formStyles.backLink}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M10.5 3L5.5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        一覧へ戻る
      </Link>

      <h1 className={formStyles.title}>ユーザー詳細</h1>

      <div className={formStyles.card}>
        <dl className={styles.meta}>
          <div className={styles.metaRow}>
            <dt>ID</dt>
            <dd>{user.id}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt>登録日</dt>
            <dd>{user.createdAt}</dd>
          </div>
        </dl>

        <form
          className={formStyles.form}
          onSubmit={handleSubmit}
          {...{
            toolname: "update_user",
            tooldescription:
              "Update the user currently shown on this page. The form is prefilled with the current profile. Edit name, email, department, position, permission, status, join date, or notes, then submit to save.",
          }}
        >
          <div className={formStyles.field}>
            <label htmlFor="last_name" className={formStyles.label}>
              姓<span className={formStyles.required} aria-hidden="true">*</span>
            </label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              className={formStyles.input}
              required
              aria-required="true"
              autoComplete="family-name"
              defaultValue={lastName}
              {...{ toolparamdescription: "User's last name in Japanese (e.g. 田中). Prefilled with the current value." }}
            />
          </div>

          <div className={formStyles.field}>
            <label htmlFor="first_name" className={formStyles.label}>
              名<span className={formStyles.required} aria-hidden="true">*</span>
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              className={formStyles.input}
              required
              aria-required="true"
              autoComplete="given-name"
              defaultValue={firstName}
              {...{ toolparamdescription: "User's first name in Japanese (e.g. 太郎). Prefilled with the current value." }}
            />
          </div>

          <div className={formStyles.field}>
            <label htmlFor="email" className={formStyles.label}>
              メールアドレス<span className={formStyles.required} aria-hidden="true">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className={formStyles.input}
              required
              aria-required="true"
              autoComplete="email"
              defaultValue={user.email}
              {...{ toolparamdescription: "User's email address. Prefilled with the current value." }}
            />
          </div>

          <div className={formStyles.field}>
            <label htmlFor="department" className={formStyles.label}>
              部署
            </label>
            <select
              id="department"
              name="department"
              className={formStyles.select}
              defaultValue={departmentValue}
              {...{ toolparamdescription: "Department the user belongs to. Options: 営業部, 開発部, 人事部, 経理部, マーケティング部, カスタマーサポート部. Optional." }}
            >
              <option value="">選択してください（任意）</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className={formStyles.field}>
            <label htmlFor="position" className={formStyles.label}>
              役職
            </label>
            <select
              id="position"
              name="position"
              className={formStyles.select}
              defaultValue={positionValue}
              {...{ toolparamdescription: "Job title. Options: 一般社員, 主任, 係長, 課長, 部長. Optional." }}
            >
              <option value="">選択してください（任意）</option>
              {positions.map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          <div className={formStyles.field}>
            <label htmlFor="permission" className={formStyles.label}>
              権限
            </label>
            <select
              id="permission"
              name="permission"
              className={formStyles.select}
              defaultValue={permissionValue}
              {...{ toolparamdescription: "Permission level. Options: 一般 (general), 管理者 (admin), 閲覧のみ (readonly). Optional." }}
            >
              <option value="">選択してください（任意）</option>
              {permissionOptions.map((permission) => (
                <option key={permission.value} value={permission.value}>{permission.label}</option>
              ))}
            </select>
          </div>

          <fieldset className={formStyles.field} style={{ border: "none", padding: 0 }}>
            <legend className={formStyles.label}>ステータス</legend>
            <div
              className={formStyles.radioGroup}
              {...{ toolparamdescription: "Account status: 有効 (active) or 無効 (inactive)." }}
            >
              <label className={formStyles.radioLabel}>
                <input
                  type="radio"
                  name="status"
                  value="有効"
                  defaultChecked={user.status === "有効"}
                />
                有効
              </label>
              <label className={formStyles.radioLabel}>
                <input
                  type="radio"
                  name="status"
                  value="無効"
                  defaultChecked={user.status === "無効"}
                />
                無効
              </label>
            </div>
          </fieldset>

          <div className={formStyles.field}>
            <label htmlFor="join_date" className={formStyles.label}>
              入社日
            </label>
            <input
              id="join_date"
              name="join_date"
              type="date"
              className={formStyles.input}
              defaultValue={user.joinDate}
              {...{ toolparamdescription: "Date the user joined the company, in YYYY-MM-DD. Optional." }}
            />
          </div>

          <div className={formStyles.field}>
            <label htmlFor="notes" className={formStyles.label}>
              備考
            </label>
            <textarea
              id="notes"
              name="notes"
              className={formStyles.textarea}
              defaultValue={user.notes}
              {...{ toolparamdescription: "Additional notes about this user. Optional." }}
            />
          </div>

          <div className={formStyles.actions}>
            <button type="button" className={formStyles.cancelButton} onClick={() => navigate("/users")}>
              キャンセル
            </button>
            <button type="submit" className={formStyles.submitButton} disabled={submitted}>
              保存する
            </button>
          </div>
        </form>

        <div className={styles.dangerZone}>
          <p className={styles.dangerText}>削除すると、このユーザーは一覧から外れます。</p>
          <button
            type="button"
            className={styles.deleteButton}
            onClick={() => setConfirmOpen(true)}
          >
            このユーザーを削除
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="ユーザーを削除しますか？"
        message={`${user.name} を削除してもよろしいですか？`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </section>
  );
}

export default function UserDetailPage() {
  const { id } = useParams();
  const numericId = Number(id);
  const store = useUserStore();
  const user = Number.isInteger(numericId) ? findUser(store, numericId) : undefined;

  if (!user) return <UserNotFound />;
  return <UserDetailForm key={user.id} user={user} />;
}
