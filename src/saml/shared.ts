export const SAML_METADATA_PATH = "/api/saml/metadata";
export const SAML_ACS_PATH = "/api/saml/acs";
export const SAML_LOGIN_PATH = "/api/saml/login";
export const SAML_TEST_RESPONSE_PATH = "/api/saml/test-response";

export const NAMEID_FORMAT_EMAIL = "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress";
export const DUMMY_IDP_ISSUER = "urn:example:dummy-idp";

export const MAX_SAML_BYTES = 256 * 1024;

export function serviceProviderUrls(origin: string) {
  return {
    entityId: `${origin}${SAML_METADATA_PATH}`,
    acsUrl: `${origin}${SAML_ACS_PATH}`,
    metadataUrl: `${origin}${SAML_METADATA_PATH}`,
    nameIdFormat: NAMEID_FORMAT_EMAIL,
  };
}

export function isSafeIssuer(value: string): boolean {
  return /^[A-Za-z0-9._:/-]{1,200}$/.test(value);
}

export function isSafeNameId(value: string): boolean {
  return (
    value.length <= 254 &&
    /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value)
  );
}

export function isSafeIdpSsoUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  if (url.protocol === "https:") return true;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  return url.protocol === "http:" && (host === "localhost" || host === "127.0.0.1" || host === "::1");
}

/**
 * RelayState may only be a same-app relative path. Reject scheme-relative
 * values, backslashes, and absolute URLs so the ACS cannot become an open redirect.
 */
export function isSafeRelayState(value: string): boolean {
  if (value.length === 0 || value.length > 512) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  if (value.includes("\\") || value.includes("\0")) return false;
  if (/[\u0000-\u001f\u007f]/.test(value)) return false;

  const lower = value.toLowerCase();
  if (lower.startsWith("/%2f") || lower.startsWith("/%5c")) return false;
  if (lower.includes("%00") || lower.includes("%0a") || lower.includes("%0d")) return false;

  let decoded = value;
  try {
    decoded = decodeURI(value);
  } catch {
    return false;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.startsWith("/\\")) return false;
  if (decoded.includes("\\") || decoded.includes("://")) return false;
  if (/[\u0000-\u001f\u007f]/.test(decoded)) return false;

  try {
    const url = new URL(value, "https://sp.invalid");
    if (url.origin !== "https://sp.invalid") return false;
    if (!url.pathname.startsWith("/") || url.pathname.startsWith("//")) return false;
  } catch {
    return false;
  }
  return true;
}
