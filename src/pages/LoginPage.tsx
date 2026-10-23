import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router";
import { recordLogin } from "@/hooks/useAuditLogStore";
import { useSamlIdpSettings } from "@/hooks/useSamlConfig";
import { startSpInitiatedLogin, submitSimulatedSaml, validateIdpSettings } from "@/src/saml/browser";
import { isSafeIdpSsoUrl } from "@/src/saml/shared";
import styles from "@/styles/login.module.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const idp = useSamlIdpSettings();
  const [samlError, setSamlError] = useState("");
  const [samlPending, setSamlPending] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    recordLogin(email);
    navigate("/dashboard");
  };

  const handleSamlLogin = async () => {
    setSamlError("");
    const ssoUrl = idp.ssoUrl.trim();
    if (ssoUrl) {
      if (!isSafeIdpSsoUrl(ssoUrl)) {
        setSamlError("SSO URL は https の絶対 URL を指定してください。");
        return;
      }
      setSamlPending(true);
      try {
        await startSpInitiatedLogin(ssoUrl);
      } catch {
        setSamlPending(false);
        setSamlError("SAML ログイン要求を作成できませんでした。");
      }
      return;
    }
    const invalid = validateIdpSettings(idp);
    if (invalid) {
      setSamlError(invalid);
      return;
    }
    setSamlPending(true);
    try {
      await submitSimulatedSaml(idp, "/dashboard");
    } catch {
      setSamlPending(false);
      setSamlError("SAML テスト応答を作成できませんでした。");
    }
  };

  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <div className={styles.logoArea}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="6" fill="#1e40af" />
            <path d="M7 8h10M7 12h10M7 16h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h1>SaaS Admin</h1>
          <p>管理画面にログイン</p>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="email">メールアドレス</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="admin@example.com"
              defaultValue="admin@example.com"
              autoComplete="email"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              placeholder="パスワードを入力"
              defaultValue="xK9#mQ2$vL5@nR8w"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className={styles.submitButton}>
            ログイン
          </button>
          <p className={styles.divider}>または</p>
          <button type="button" className={styles.samlButton} onClick={handleSamlLogin} disabled={samlPending}>
            {samlPending ? "送信中..." : "SAML SSOでログイン"}
          </button>
          <p className={styles.samlHint}>
            {idp.ssoUrl.trim()
              ? "保存した IdP SSO URL へ SAML リクエストを送ります。"
              : "IdP の SSO URL が未設定のときは、テスト用の SAML 応答でログインします。"}
          </p>
          {samlError ? (
            <p className={styles.samlError} role="alert">
              {samlError}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}
