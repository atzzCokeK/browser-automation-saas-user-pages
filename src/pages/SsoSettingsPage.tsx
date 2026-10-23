import { useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router";
import { saveIdpSettings, submitSimulatedSaml, validateIdpSettings } from "@/src/saml/browser";
import { NAMEID_FORMAT_EMAIL, SAML_ACS_PATH, SAML_METADATA_PATH } from "@/src/saml/shared";
import { useSamlIdpSettings, type SamlIdpSettings } from "@/hooks/useSamlConfig";
import styles from "@/styles/sso.module.css";

const REASONS: Record<string, string> = {
  payload_too_large: "SAMLResponse が 256KB を超えています。",
  invalid_content_type: "Content-Type がフォーム送信の形式ではありません。",
  missing_saml_response: "SAMLResponse がありません。",
  invalid_base64: "SAMLResponse を Base64 として解釈できません。",
  xxe_forbidden: "DTD と外部実体は拒否しました。",
  invalid_xml: "SAML の XML を解釈できません。",
  invalid_relay_state: "RelayState は / から始まる相対パスだけを受け付けます。",
  signature_missing: "Assertion に XML 署名がありません。",
  signature_invalid: "XML 署名の検証に失敗しました。",
  audience_mismatch: "Audience がこの SP の Entity ID と一致しません。",
  recipient_mismatch: "Recipient が ACS URL と一致しません。",
  destination_mismatch: "Destination が ACS URL と一致しません。",
  expired: "Assertion の有効期限が切れています。",
  not_yet_valid: "Assertion の有効期間前です。",
  status_not_success: "SAML Status が Success ではありません。",
  idp_cert_required: "署名検証の強制には IdP の公開証明書が必要です。",
  idp_cert_invalid: "IdP 証明書を読み取れません。秘密鍵は受け付けません。",
  idp_cert_mismatch: "署名証明書が設定した IdP 証明書と一致しません。",
  issuer_mismatch: "Issuer が設定した IdP Entity ID と一致しません。",
  invalid_assertion: "Assertion の必須項目が不足しているか、表示できない文字を含んでいます。",
};

export default function SsoSettingsPage() {
  const saved = useSamlIdpSettings();
  const [draft, setDraft] = useState<SamlIdpSettings>(saved);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [pending, setPending] = useState(false);
  const [searchParams] = useSearchParams();
  const origin = window.location.origin;
  const sp = {
    entityId: `${origin}${SAML_METADATA_PATH}`,
    acsUrl: `${origin}${SAML_ACS_PATH}`,
    metadataUrl: `${origin}${SAML_METADATA_PATH}`,
    nameIdFormat: NAMEID_FORMAT_EMAIL,
  };
  const samlStatus = searchParams.get("saml");
  const attributes = searchParams
    .getAll("attr")
    .map((entry) => {
      const separator = entry.indexOf("=");
      if (separator <= 0) return null;
      return { name: entry.slice(0, separator), value: entry.slice(separator + 1) };
    })
    .filter((entry): entry is { name: string; value: string } => entry !== null);

  const update = (patch: Partial<SamlIdpSettings>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setNotice("");
    setError("");
  };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = validateIdpSettings(draft);
    if (message) {
      setError(message);
      setNotice("");
      return;
    }
    saveIdpSettings(normalize(draft));
    setNotice("IdP設定をブラウザに保存しました。再読み込みすると消えます。");
    setError("");
  };

  const handleTest = async () => {
    const message = validateIdpSettings(draft);
    if (message) {
      setError(message);
      setNotice("");
      return;
    }
    const settings = normalize(draft);
    saveIdpSettings(settings);
    setPending(true);
    setError("");
    try {
      await submitSimulatedSaml(settings, "/settings/sso");
    } catch {
      setPending(false);
      setError("テスト用の SAML 応答を作成できませんでした。");
    }
  };

  const copy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      window.setTimeout(() => setCopied((current) => (current === id ? "" : current)), 2000);
    } catch {
      setCopied("");
      setError("コピーできませんでした。値を選択してコピーしてください。");
    }
  };

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>SSO設定 (SAML)</h1>
      <p className={styles.lead}>
        試験用の SAML 2.0 Service Provider です。IdP 設定はブラウザのメモリだけに残り、再読み込みで消えます。秘密鍵や本番の証明書は入力しないでください。
      </p>

      {samlStatus === "success" ? (
        <div className={styles.success} role="status">
          <h2>SAML 検証結果: 成功</h2>
          <dl>
            <div>
              <dt>NameID</dt>
              <dd>{searchParams.get("nameId") || "（なし）"}</dd>
            </div>
            <div>
              <dt>Issuer</dt>
              <dd>{searchParams.get("issuer") || "（なし）"}</dd>
            </div>
            <div>
              <dt>XML 署名</dt>
              <dd>{searchParams.get("signed") === "1" ? "検証済み" : "（なし）"}</dd>
            </div>
          </dl>
          {attributes.length > 0 ? (
            <ul>
              {attributes.map((attribute) => (
                <li key={`${attribute.name}:${attribute.value}`}>
                  {attribute.name}: {attribute.value}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {samlStatus === "error" ? (
        <div className={styles.error} role="alert">
          <h2>SAML 検証結果: 失敗</h2>
          <p>{REASONS[searchParams.get("reason") ?? ""] ?? "SAML 応答を受け付けられませんでした。"}</p>
        </div>
      ) : null}

      <section className={styles.card} aria-labelledby="sp-config-title">
        <h2 id="sp-config-title">SP 構成</h2>
        <p className={styles.note}>Okta、Entra ID、Google Workspace には次の値を登録します。</p>
        <CopyField id="entity-id" label="Entity ID" value={sp.entityId} copied={copied === "entity-id"} onCopy={copy} />
        <CopyField id="acs-url" label="ACS URL" value={sp.acsUrl} copied={copied === "acs-url"} onCopy={copy} />
        <CopyField
          id="metadata-url"
          label="Metadata URL"
          value={sp.metadataUrl}
          copied={copied === "metadata-url"}
          onCopy={copy}
        />
        <CopyField
          id="nameid-format"
          label="NameID Format"
          value={sp.nameIdFormat}
          copied={copied === "nameid-format"}
          onCopy={copy}
        />
        <p className={styles.note}>
          <a href={sp.metadataUrl}>メタデータ XML を表示</a>
        </p>
        {copied ? (
          <p className={styles.copied} aria-live="polite">
            コピーしました
          </p>
        ) : null}
      </section>

      <section className={styles.card} aria-labelledby="idp-config-title">
        <h2 id="idp-config-title">IdP 設定</h2>
        <form
          className={styles.form}
          onSubmit={handleSave}
          {...{
            toolname: "configure_saml_idp",
            tooldescription:
              "Save dummy SAML IdP settings in browser memory: entity ID, SSO URL, X.509 certificate, and whether to require that certificate for signature validation.",
          }}
        >
          <div className={styles.field}>
            <label htmlFor="idp_entity_id" className={styles.label}>
              IdP Entity ID
            </label>
            <input
              id="idp_entity_id"
              name="idp_entity_id"
              type="text"
              className={styles.input}
              value={draft.entityId}
              spellCheck={false}
              autoComplete="off"
              placeholder="urn:example:dummy-idp"
              onChange={(event) => update({ entityId: event.target.value })}
              {...{ toolparamdescription: "IdP entity ID, as a URL or URN. Optional. Example: urn:example:dummy-idp" }}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="idp_sso_url" className={styles.label}>
              IdP SSO URL
            </label>
            <input
              id="idp_sso_url"
              name="idp_sso_url"
              type="url"
              className={styles.input}
              value={draft.ssoUrl}
              spellCheck={false}
              autoComplete="off"
              placeholder="https://idp.example.com/sso"
              onChange={(event) => update({ ssoUrl: event.target.value })}
              {...{
                toolparamdescription:
                  "HTTPS URL of the IdP SSO endpoint used for SP-initiated login. Optional. http is accepted only for localhost.",
              }}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="idp_certificate" className={styles.label}>
              IdP X.509 Certificate
            </label>
            <textarea
              id="idp_certificate"
              name="idp_certificate"
              className={styles.textarea}
              value={draft.certificate}
              spellCheck={false}
              autoComplete="off"
              placeholder="-----BEGIN CERTIFICATE-----"
              onChange={(event) => update({ certificate: event.target.value })}
              {...{
                toolparamdescription:
                  "IdP public X.509 certificate in PEM format. Do not paste a private key. Optional unless signature pinning is enabled.",
              }}
            />
          </div>
          <label className={styles.check}>
            <input
              type="checkbox"
              name="enforce_signature"
              checked={draft.enforceSignature}
              onChange={(event) => update({ enforceSignature: event.target.checked })}
              {...{
                toolparamdescription:
                  "When checked, the ACS requires the assertion signature certificate to match the configured IdP certificate.",
              }}
            />
            設定した IdP 証明書への署名検証を強制する
          </label>
          <p className={styles.note}>
            XML 署名、Audience、Recipient、有効期限は常に検証します。強制をオンにすると、署名証明書がこの公開証明書と一致する必要があります。証明書が空のときのテスト送信は、その送信だけでシミュレーターの自己署名証明書を使います。
          </p>
          <div className={styles.actions}>
            <button type="submit" className={styles.secondaryButton}>
              IdP設定を保存
            </button>
          </div>
        </form>
        {notice ? <p className={styles.notice}>{notice}</p> : null}
        {error ? (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section className={styles.card} aria-labelledby="saml-test-title">
        <h2 id="saml-test-title">接続テスト</h2>
        <p className={styles.note}>
          テスト用の自己署名証明書は送信のたびに作り、秘密鍵は保存しません。応答は ACS で検証し、この画面に結果を戻します。
        </p>
        <button type="button" className={styles.primaryButton} onClick={handleTest} disabled={pending}>
          {pending ? "送信中..." : "SAMLテスト送信 (IdP-Initiated SSO シミュレート)"}
        </button>
      </section>
    </section>
  );
}

function normalize(settings: SamlIdpSettings): SamlIdpSettings {
  return {
    entityId: settings.entityId.trim(),
    ssoUrl: settings.ssoUrl.trim(),
    certificate: settings.certificate.trim(),
    enforceSignature: settings.enforceSignature,
  };
}

function CopyField({
  id,
  label,
  value,
  copied,
  onCopy,
}: {
  id: string;
  label: string;
  value: string;
  copied: boolean;
  onCopy: (id: string, value: string) => void;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.copyRow}>
        <input id={id} className={styles.input} value={value} readOnly spellCheck={false} />
        <button type="button" className={styles.copyButton} aria-label={`${label}をコピー`} onClick={() => onCopy(id, value)}>
          {copied ? "コピー済み" : "コピー"}
        </button>
      </div>
    </div>
  );
}
