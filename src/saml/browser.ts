import { getSamlIdpSettings, setSamlIdpSettings, type SamlIdpSettings } from "@/hooks/useSamlConfig";
import { DUMMY_IDP_ISSUER, SAML_LOGIN_PATH, SAML_TEST_RESPONSE_PATH, isSafeIdpSsoUrl, isSafeIssuer } from "@/src/saml/shared";

export type TestSamlPayload = {
  samlResponse: string;
  certificatePem: string;
  idpEntityId: string;
  relayState: string;
  acsUrl: string;
  entityId: string;
  nameIdFormat: string;
};

export function validateIdpSettings(settings: SamlIdpSettings): string | null {
  if (settings.entityId.trim() !== "" && !isSafeIssuer(settings.entityId.trim())) {
    return "IdP Entity ID は 200 文字以内の URL か URN で入力してください。";
  }
  if (settings.ssoUrl.trim() !== "" && !isSafeIdpSsoUrl(settings.ssoUrl.trim())) {
    return "IdP SSO URL は https の絶対 URL を指定してください。";
  }
  if (/PRIVATE KEY/.test(settings.certificate)) {
    return "秘密鍵は貼らないでください。公開証明書だけを入力します。";
  }
  return null;
}

export async function startSpInitiatedLogin(ssoUrl: string) {
  const response = await fetch(SAML_LOGIN_PATH, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("login_failed");
  const data = (await response.json()) as { samlRequest?: string; relayState?: string };
  if (!data.samlRequest || !data.relayState) throw new Error("login_failed");
  const url = new URL(ssoUrl);
  url.searchParams.set("SAMLRequest", data.samlRequest);
  url.searchParams.set("RelayState", data.relayState);
  window.location.assign(url.href);
}

export async function submitSimulatedSaml(settings: SamlIdpSettings, relayState: string) {
  const response = await fetch(SAML_TEST_RESPONSE_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      nameId: "admin@example.com",
      issuer: isSafeIssuer(settings.entityId.trim()) ? settings.entityId.trim() : DUMMY_IDP_ISSUER,
      relayState,
    }),
  });
  const data = (await response.json().catch(() => null)) as TestSamlPayload & { error?: string } | null;
  if (!response.ok || !data?.samlResponse || !data.certificatePem) {
    throw new Error(data?.error || "test_response_failed");
  }
  writeEnforceCookies(settings, data.certificatePem);
  postSamlForm(data.samlResponse, relayState);
}

export function saveIdpSettings(settings: SamlIdpSettings) {
  setSamlIdpSettings(settings);
}

export function currentIdpSettings() {
  return getSamlIdpSettings();
}

function writeEnforceCookies(settings: SamlIdpSettings, simulatorCertificate: string) {
  if (!settings.enforceSignature) {
    clearCookie("saml_enforce");
    clearCookie("saml_idp_cert");
    clearCookie("saml_idp_entity");
    return;
  }
  const certificate = settings.certificate.trim() || simulatorCertificate;
  setCookie("saml_enforce", "1");
  setCookie("saml_idp_cert", certificate);
  setCookie("saml_idp_entity", settings.entityId.trim());
}

function postSamlForm(samlResponse: string, relayState: string) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/saml/acs";
  form.acceptCharset = "UTF-8";
  form.append(hiddenInput("SAMLResponse", samlResponse), hiddenInput("RelayState", relayState));
  document.body.append(form);
  form.submit();
}

function hiddenInput(name: string, value: string) {
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = name;
  input.value = value;
  return input;
}

function setCookie(name: string, value: string) {
  const secure = window.location.protocol === "https:";
  const sameSite = secure ? "None" : "Strict";
  const secureAttr = secure ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=300; SameSite=${sameSite}${secureAttr}`;
}

function clearCookie(name: string) {
  const secure = window.location.protocol === "https:";
  const sameSite = secure ? "None" : "Strict";
  const secureAttr = secure ? "; Secure" : "";
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=${sameSite}${secureAttr}`;
}
