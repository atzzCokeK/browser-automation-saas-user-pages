import {
  DUMMY_IDP_ISSUER,
  MAX_SAML_BYTES,
  NAMEID_FORMAT_EMAIL,
  isSafeIssuer,
  isSafeNameId,
  isSafeRelayState,
  serviceProviderUrls,
} from "../saml/shared";
import {
  elementNamespace,
  exclusiveCanonicalize,
  parseXml,
  xmlAttr,
  xmlElement,
  xmlNs,
  type XmlElement,
} from "./xml";
import {
  base64ToBytes,
  bytesEqual,
  bytesToBase64,
  certificateDerFromText,
  createDummyIdpCertificate,
  spkiFromCertificate,
  toArrayBuffer,
} from "./x509";

const SAML_ASSERTION_NS = "urn:oasis:names:tc:SAML:2.0:assertion";
const SAML_PROTOCOL_NS = "urn:oasis:names:tc:SAML:2.0:protocol";
const DS_NS = "http://www.w3.org/2000/09/xmldsig#";
const EXC_C14N = "http://www.w3.org/2001/10/xml-exc-c14n#";
const RSA_SHA256 = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
const DIGEST_SHA256 = "http://www.w3.org/2001/04/xmlenc#sha256";
const ENVELOPED_SIGNATURE = "http://www.w3.org/2000/09/xmldsig#enveloped-signature";
const STATUS_SUCCESS = "urn:oasis:names:tc:SAML:2.0:status:Success";
const SKEW_MS = 3 * 60 * 1000;
const MAX_AGE_MS = 10 * 60 * 1000;

export type SamlFailureReason =
  | "payload_too_large"
  | "invalid_content_type"
  | "missing_saml_response"
  | "invalid_base64"
  | "xxe_forbidden"
  | "invalid_xml"
  | "invalid_relay_state"
  | "signature_missing"
  | "signature_invalid"
  | "audience_mismatch"
  | "recipient_mismatch"
  | "destination_mismatch"
  | "expired"
  | "not_yet_valid"
  | "status_not_success"
  | "idp_cert_required"
  | "idp_cert_invalid"
  | "idp_cert_mismatch"
  | "issuer_mismatch"
  | "invalid_assertion"
  | "invalid_json"
  | "invalid_name_id"
  | "invalid_issuer"
  | "test_response_failed";

export type SamlAttribute = { name: string; value: string };

export type SamlVerification =
  | {
      ok: true;
      issuer: string;
      nameId: string;
      signed: true;
      attributes: SamlAttribute[];
    }
  | { ok: false; reason: SamlFailureReason };

type VerifyOptions = {
  entityId: string;
  acsUrl: string;
  now: Date;
  pinnedCertificatePem?: string | null;
  pinnedIssuer?: string | null;
};

type TestResponseOptions = {
  origin: string;
  nameId?: string;
  issuer?: string;
  now?: Date;
  audience?: string;
  recipient?: string;
  notOnOrAfter?: string;
  selfCheck?: boolean;
};

export function buildMetadata(origin: string): string {
  const urls = serviceProviderUrls(origin);
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${escapeXml(urls.entityId)}">` +
    `<md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">` +
    `<md:NameIDFormat>${NAMEID_FORMAT_EMAIL}</md:NameIDFormat>` +
    `<md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${escapeXml(urls.acsUrl)}" index="0" isDefault="true"/>` +
    `</md:SPSSODescriptor></md:EntityDescriptor>`
  );
}

export async function createAuthnRequest(origin: string) {
  const urls = serviceProviderUrls(origin);
  const request = xmlElement("samlp:AuthnRequest", {
    attrs: [
      xmlAttr("ID", newId()),
      xmlAttr("Version", "2.0"),
      xmlAttr("IssueInstant", formatInstant(new Date())),
      xmlAttr("AssertionConsumerServiceURL", urls.acsUrl),
      xmlAttr("ProtocolBinding", "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"),
    ],
    ns: [xmlNs("samlp", SAML_PROTOCOL_NS), xmlNs("saml", SAML_ASSERTION_NS)],
    children: [
      xmlElement("saml:Issuer", { children: [urls.entityId] }),
      xmlElement("samlp:NameIDPolicy", {
        attrs: [xmlAttr("Format", NAMEID_FORMAT_EMAIL), xmlAttr("AllowCreate", "true")],
      }),
    ],
  });
  const compressed = await deflateRaw(new TextEncoder().encode(exclusiveCanonicalize(request)));
  return {
    samlRequest: bytesToBase64(compressed),
    relayState: "/dashboard",
    acsUrl: urls.acsUrl,
    entityId: urls.entityId,
    nameIdFormat: NAMEID_FORMAT_EMAIL,
  };
}

export async function createTestSamlResponse(input: TestResponseOptions) {
  const urls = serviceProviderUrls(input.origin);
  const now = input.now ?? new Date();
  const nameId = input.nameId ?? "admin@example.com";
  const issuer = input.issuer ?? DUMMY_IDP_ISSUER;
  const audience = input.audience ?? urls.entityId;
  const recipient = input.recipient ?? urls.acsUrl;
  const instant = formatInstant(now);
  const notBefore = formatInstant(new Date(now.getTime() - 60_000));
  const notOnOrAfter = input.notOnOrAfter ?? formatInstant(new Date(now.getTime() + 5 * 60_000));
  const assertionId = newId();
  const certificate = await createDummyIdpCertificate();

  const assertion = xmlElement("saml:Assertion", {
    attrs: [xmlAttr("ID", assertionId), xmlAttr("Version", "2.0"), xmlAttr("IssueInstant", instant)],
    ns: [xmlNs("saml", SAML_ASSERTION_NS)],
    children: [
      xmlElement("saml:Issuer", { children: [issuer] }),
      xmlElement("saml:Subject", {
        children: [
          xmlElement("saml:NameID", {
            attrs: [xmlAttr("Format", NAMEID_FORMAT_EMAIL)],
            children: [nameId],
          }),
          xmlElement("saml:SubjectConfirmation", {
            attrs: [xmlAttr("Method", "urn:oasis:names:tc:SAML:2.0:cm:bearer")],
            children: [
              xmlElement("saml:SubjectConfirmationData", {
                attrs: [
                  xmlAttr("NotBefore", notBefore),
                  xmlAttr("NotOnOrAfter", notOnOrAfter),
                  xmlAttr("Recipient", recipient),
                ],
              }),
            ],
          }),
        ],
      }),
      xmlElement("saml:Conditions", {
        attrs: [xmlAttr("NotBefore", notBefore), xmlAttr("NotOnOrAfter", notOnOrAfter)],
        children: [
          xmlElement("saml:AudienceRestriction", {
            children: [xmlElement("saml:Audience", { children: [audience] })],
          }),
        ],
      }),
      xmlElement("saml:AttributeStatement", {
        children: [attributeElement("email", nameId), attributeElement("displayName", "SAML Test User")],
      }),
      xmlElement("saml:AuthnStatement", {
        attrs: [xmlAttr("AuthnInstant", instant)],
        children: [
          xmlElement("saml:AuthnContext", {
            children: [
              xmlElement("saml:AuthnContextClassRef", {
                children: ["urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport"],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const digest = await sha256Base64(exclusiveCanonicalize(assertion));
  const signedInfo = xmlElement("ds:SignedInfo", {
    ns: [xmlNs("ds", DS_NS)],
    children: [
      xmlElement("ds:CanonicalizationMethod", { attrs: [xmlAttr("Algorithm", EXC_C14N)] }),
      xmlElement("ds:SignatureMethod", { attrs: [xmlAttr("Algorithm", RSA_SHA256)] }),
      xmlElement("ds:Reference", {
        attrs: [xmlAttr("URI", `#${assertionId}`)],
        children: [
          xmlElement("ds:Transforms", {
            children: [
              xmlElement("ds:Transform", { attrs: [xmlAttr("Algorithm", ENVELOPED_SIGNATURE)] }),
              xmlElement("ds:Transform", { attrs: [xmlAttr("Algorithm", EXC_C14N)] }),
            ],
          }),
          xmlElement("ds:DigestMethod", { attrs: [xmlAttr("Algorithm", DIGEST_SHA256)] }),
          xmlElement("ds:DigestValue", { children: [digest] }),
        ],
      }),
    ],
  });
  const signatureBytes = new Uint8Array(
    await crypto.subtle.sign(
      { name: "RSASSA-PKCS1-v1_5" },
      certificate.privateKey,
      new TextEncoder().encode(exclusiveCanonicalize(signedInfo)),
    ),
  );
  const signature = xmlElement("ds:Signature", {
    ns: [xmlNs("ds", DS_NS)],
    children: [
      signedInfo,
      xmlElement("ds:SignatureValue", { children: [bytesToBase64(signatureBytes)] }),
      xmlElement("ds:KeyInfo", {
        children: [
          xmlElement("ds:X509Data", {
            children: [xmlElement("ds:X509Certificate", { children: [bytesToBase64(certificate.certificateDer)] })],
          }),
        ],
      }),
    ],
  });
  signature.parent = assertion;
  assertion.children.splice(1, 0, signature);

  const response = xmlElement("samlp:Response", {
    attrs: [
      xmlAttr("ID", newId()),
      xmlAttr("Version", "2.0"),
      xmlAttr("IssueInstant", instant),
      xmlAttr("Destination", urls.acsUrl),
    ],
    ns: [xmlNs("samlp", SAML_PROTOCOL_NS), xmlNs("saml", SAML_ASSERTION_NS)],
    children: [
      xmlElement("saml:Issuer", { children: [issuer] }),
      xmlElement("samlp:Status", {
        children: [xmlElement("samlp:StatusCode", { attrs: [xmlAttr("Value", STATUS_SUCCESS)] })],
      }),
      assertion,
    ],
  });
  const xml = exclusiveCanonicalize(response);
  if (input.selfCheck !== false) {
    const verified = await verifySamlResponse(xml, {
      entityId: urls.entityId,
      acsUrl: urls.acsUrl,
      now,
      pinnedCertificatePem: certificate.certificatePem,
      pinnedIssuer: issuer,
    });
    if (!verified.ok) throw new Error(verified.reason);
  }
  return {
    xml,
    samlResponse: bytesToBase64(new TextEncoder().encode(xml)),
    certificatePem: certificate.certificatePem,
    idpEntityId: issuer,
    acsUrl: urls.acsUrl,
    entityId: urls.entityId,
    nameIdFormat: NAMEID_FORMAT_EMAIL,
  };
}

export async function verifySamlResponse(xml: string, options: VerifyOptions): Promise<SamlVerification> {
  if (/<!(\s*)(DOCTYPE|ENTITY|ELEMENT|ATTLIST|NOTATION)/i.test(xml)) {
    return { ok: false, reason: "xxe_forbidden" };
  }
  let root: XmlElement;
  try {
    root = parseXml(xml);
  } catch (error) {
    const reason = error instanceof Error && error.message === "dtd forbidden" ? "xxe_forbidden" : "invalid_xml";
    return { ok: false, reason };
  }
  if (root.localName !== "Response" || elementNamespace(root) !== SAML_PROTOCOL_NS) {
    return { ok: false, reason: "invalid_assertion" };
  }
  const destination = attrValue(root, "Destination");
  if (destination && destination !== options.acsUrl) return { ok: false, reason: "destination_mismatch" };

  const assertions = elementsNamed(root, "Assertion", SAML_ASSERTION_NS);
  if (assertions.length !== 1) return { ok: false, reason: "invalid_assertion" };
  const assertion = assertions[0];
  const signatures = elementsNamed(assertion, "Signature", DS_NS);
  if (signatures.length === 0) return { ok: false, reason: "signature_missing" };
  if (signatures.length !== 1) return { ok: false, reason: "signature_invalid" };

  const signed = await verifyEnvelopedSignature(assertion, signatures[0]);
  if (signed.reason !== "ok") return { ok: false, reason: signed.reason };

  const status = directChildren(root, "Status", SAML_PROTOCOL_NS)[0];
  const statusCode = status ? directChildren(status, "StatusCode", SAML_PROTOCOL_NS)[0] : undefined;
  if (!statusCode || attrValue(statusCode, "Value") !== STATUS_SUCCESS) {
    return { ok: false, reason: "status_not_success" };
  }

  const assertionIssuerElement = directChildren(assertion, "Issuer", SAML_ASSERTION_NS)[0];
  if (!assertionIssuerElement) return { ok: false, reason: "invalid_assertion" };
  const issuer = textContent(assertionIssuerElement).trim();
  if (!issuer || issuer.length > 200 || /[\u0000-\u001f\u007f<>"'`\\]/.test(issuer)) {
    return { ok: false, reason: "invalid_assertion" };
  }
  const responseIssuer = directChildren(root, "Issuer", SAML_ASSERTION_NS)[0];
  if (responseIssuer && textContent(responseIssuer).trim() !== issuer) {
    return { ok: false, reason: "issuer_mismatch" };
  }

  const subject = directChildren(assertion, "Subject", SAML_ASSERTION_NS)[0];
  const nameIdElement = subject ? directChildren(subject, "NameID", SAML_ASSERTION_NS)[0] : undefined;
  if (!nameIdElement || attrValue(nameIdElement, "Format") !== NAMEID_FORMAT_EMAIL) {
    return { ok: false, reason: "invalid_assertion" };
  }
  const nameId = textContent(nameIdElement).trim();
  if (!nameId || nameId.length > 254 || /[\u0000-\u001f\u007f<>"'`\\]/.test(nameId)) {
    return { ok: false, reason: "invalid_assertion" };
  }

  const audiences = elementsNamed(assertion, "Audience", SAML_ASSERTION_NS).map((node) => textContent(node).trim());
  if (!audiences.includes(options.entityId)) return { ok: false, reason: "audience_mismatch" };

  const issued = parseSamlTime(attrValue(assertion, "IssueInstant") ?? "");
  if (!issued) return { ok: false, reason: "invalid_assertion" };
  if (issued.getTime() > options.now.getTime() + SKEW_MS) return { ok: false, reason: "not_yet_valid" };
  if (options.now.getTime() - issued.getTime() > MAX_AGE_MS) return { ok: false, reason: "expired" };

  const conditions = directChildren(assertion, "Conditions", SAML_ASSERTION_NS);
  if (conditions.length === 0) return { ok: false, reason: "invalid_assertion" };
  for (const condition of conditions) {
    const window = checkWindow(attrValue(condition, "NotBefore"), attrValue(condition, "NotOnOrAfter"), options.now);
    if (window !== "ok") return { ok: false, reason: window };
  }

  const confirmations = elementsNamed(assertion, "SubjectConfirmationData", SAML_ASSERTION_NS);
  const addressed = confirmations.filter((node) => attrValue(node, "Recipient") === options.acsUrl);
  if (addressed.length === 0) return { ok: false, reason: "recipient_mismatch" };
  let confirmationOk = false;
  let confirmationReason: SamlFailureReason = "invalid_assertion";
  for (const confirmation of addressed) {
    const window = checkWindow(attrValue(confirmation, "NotBefore"), attrValue(confirmation, "NotOnOrAfter"), options.now);
    if (window === "ok") confirmationOk = true;
    else confirmationReason = window;
  }
  if (!confirmationOk) return { ok: false, reason: confirmationReason };

  if (options.pinnedCertificatePem != null) {
    if (options.pinnedCertificatePem.trim() === "") return { ok: false, reason: "idp_cert_required" };
    if (options.pinnedCertificatePem.length > 16384) return { ok: false, reason: "idp_cert_invalid" };
    try {
      const pinned = spkiFromCertificate(certificateDerFromText(options.pinnedCertificatePem));
      if (!bytesEqual(pinned, signed.spki)) return { ok: false, reason: "idp_cert_mismatch" };
    } catch {
      return { ok: false, reason: "idp_cert_invalid" };
    }
  }
  if (options.pinnedIssuer && options.pinnedIssuer !== issuer) return { ok: false, reason: "issuer_mismatch" };

  return { ok: true, issuer, nameId, signed: true, attributes: readAttributes(assertion) };
}

export async function consumeAssertionConsumer(input: {
  origin: string;
  contentType: string;
  cookie: string | null;
  body: Uint8Array | "too_large";
}): Promise<string> {
  const fail = (reason: SamlFailureReason) => errorLocation(input.origin, reason);
  if (input.body === "too_large") return fail("payload_too_large");
  if (!isMime(input.contentType, "application/x-www-form-urlencoded")) return fail("invalid_content_type");

  let form: URLSearchParams;
  try {
    form = new URLSearchParams(new TextDecoder("utf-8", { fatal: true }).decode(input.body));
  } catch {
    return fail("invalid_xml");
  }
  const samlResponse = form.get("SAMLResponse");
  if (!samlResponse) return fail("missing_saml_response");
  const relayRaw = form.get("RelayState");
  if (relayRaw != null && relayRaw !== "" && !isSafeRelayState(relayRaw)) return fail("invalid_relay_state");
  const relayState = relayRaw && relayRaw !== "" ? relayRaw : "/settings/sso";

  let xml: string;
  try {
    const decoded = base64ToBytes(samlResponse);
    if (decoded.byteLength > MAX_SAML_BYTES) return fail("payload_too_large");
    xml = new TextDecoder("utf-8", { fatal: true }).decode(decoded);
  } catch {
    return fail("invalid_base64");
  }

  const enforce = readCookie(input.cookie, "saml_enforce") === "1";
  const urls = serviceProviderUrls(input.origin);
  const verified = await verifySamlResponse(xml, {
    entityId: urls.entityId,
    acsUrl: urls.acsUrl,
    now: new Date(),
    pinnedCertificatePem: enforce ? (readCookie(input.cookie, "saml_idp_cert") ?? "") : null,
    pinnedIssuer: enforce ? blankToNull(readCookie(input.cookie, "saml_idp_entity")) : null,
  });
  if (!verified.ok) return fail(verified.reason);
  return successLocation(input.origin, relayState, verified);
}

export async function createPublicTestResponse(input: {
  origin: string;
  contentType: string;
  body: Uint8Array | "too_large";
}): Promise<{ status: 200 | 400 | 413 | 415 | 500; body: Record<string, string> }> {
  if (input.body === "too_large") return { status: 413, body: { error: "payload_too_large" } };
  if (!isMime(input.contentType, "application/json")) {
    return { status: 415, body: { error: "invalid_content_type" } };
  }
  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(input.body));
  } catch {
    return { status: 400, body: { error: "invalid_json" } };
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { status: 400, body: { error: "invalid_json" } };
  }
  const record = payload as Record<string, unknown>;
  const nameId = record.nameId === undefined ? "admin@example.com" : record.nameId;
  const issuer = record.issuer === undefined ? DUMMY_IDP_ISSUER : record.issuer;
  const relayState = record.relayState === undefined ? "/settings/sso" : record.relayState;
  if (typeof nameId !== "string" || !isSafeNameId(nameId)) return { status: 400, body: { error: "invalid_name_id" } };
  if (typeof issuer !== "string" || !isSafeIssuer(issuer)) return { status: 400, body: { error: "invalid_issuer" } };
  if (typeof relayState !== "string" || !isSafeRelayState(relayState)) {
    return { status: 400, body: { error: "invalid_relay_state" } };
  }
  try {
    const created = await createTestSamlResponse({ origin: input.origin, nameId, issuer });
    return {
      status: 200,
      body: {
        samlResponse: created.samlResponse,
        certificatePem: created.certificatePem,
        idpEntityId: created.idpEntityId,
        relayState,
        acsUrl: created.acsUrl,
        entityId: created.entityId,
        nameIdFormat: created.nameIdFormat,
      },
    };
  } catch (error) {
    const reason = error instanceof Error && /^[a-z0-9_]+$/.test(error.message) ? error.message : "test_response_failed";
    return { status: 500, body: { error: reason } };
  }
}

export async function readBodyLimited(request: Request, maxBytes: number): Promise<Uint8Array | "too_large"> {
  const declared = request.headers.get("content-length");
  if (declared) {
    const size = Number(declared);
    if (!Number.isFinite(size) || size < 0 || size > maxBytes) return "too_large";
  }
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return "too_large";
      }
      chunks.push(value);
    }
  } catch {
    return "too_large";
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

async function verifyEnvelopedSignature(
  assertion: XmlElement,
  signature: XmlElement,
): Promise<{ reason: SamlFailureReason } | { reason: "ok"; spki: Uint8Array }> {
  const signedInfo = directChildren(signature, "SignedInfo", DS_NS)[0];
  const signatureValue = directChildren(signature, "SignatureValue", DS_NS)[0];
  const certContainer = directChildren(signature, "KeyInfo", DS_NS)[0];
  if (!signedInfo || !signatureValue || !certContainer) return { reason: "signature_invalid" };

  const canonicalization = directChildren(signedInfo, "CanonicalizationMethod", DS_NS)[0];
  const signatureMethod = directChildren(signedInfo, "SignatureMethod", DS_NS)[0];
  const reference = directChildren(signedInfo, "Reference", DS_NS)[0];
  if (!canonicalization || !signatureMethod || !reference) return { reason: "signature_invalid" };
  if (attrValue(canonicalization, "Algorithm") !== EXC_C14N) return { reason: "signature_invalid" };
  if (attrValue(signatureMethod, "Algorithm") !== RSA_SHA256) return { reason: "signature_invalid" };

  const assertionId = attrValue(assertion, "ID");
  if (!assertionId || attrValue(reference, "URI") !== `#${assertionId}`) return { reason: "signature_invalid" };
  const transforms = directChildren(reference, "Transforms", DS_NS)[0];
  const transformList = transforms ? directChildren(transforms, "Transform", DS_NS) : [];
  if (transformList.length !== 2) return { reason: "signature_invalid" };
  if (attrValue(transformList[0], "Algorithm") !== ENVELOPED_SIGNATURE) return { reason: "signature_invalid" };
  if (attrValue(transformList[1], "Algorithm") !== EXC_C14N) return { reason: "signature_invalid" };
  const digestMethod = directChildren(reference, "DigestMethod", DS_NS)[0];
  const digestValue = directChildren(reference, "DigestValue", DS_NS)[0];
  if (!digestMethod || !digestValue || attrValue(digestMethod, "Algorithm") !== DIGEST_SHA256) {
    return { reason: "signature_invalid" };
  }

  let canonicalAssertion = "";
  let canonicalSignedInfo = "";
  try {
    canonicalAssertion = exclusiveCanonicalize(
      withoutSignatures(assertion, assertion.parent),
      prefixList(transformList[1]),
    );
    canonicalSignedInfo = exclusiveCanonicalize(signedInfo, prefixList(canonicalization));
  } catch {
    return { reason: "signature_invalid" };
  }

  try {
    const expectedDigest = base64ToBytes(textContent(digestValue));
    const actualDigest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalAssertion)),
    );
    if (!bytesEqual(expectedDigest, actualDigest)) return { reason: "signature_invalid" };
    const certificates = elementsNamed(certContainer, "X509Certificate", DS_NS); // gitleaks:allow
    if (certificates.length !== 1) return { reason: "signature_invalid" };
    const spki = spkiFromCertificate(base64ToBytes(textContent(certificates[0])));
    const key = await crypto.subtle.importKey(
      "spki",
      toArrayBuffer(spki),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      key,
      toArrayBuffer(base64ToBytes(textContent(signatureValue))),
      new TextEncoder().encode(canonicalSignedInfo),
    );
    if (!valid) return { reason: "signature_invalid" };
    return { reason: "ok", spki };
  } catch {
    return { reason: "signature_invalid" };
  }
}

function withoutSignatures(element: XmlElement, parent: XmlElement | null): XmlElement {
  const copy: XmlElement = {
    name: element.name,
    prefix: element.prefix,
    localName: element.localName,
    attrs: element.attrs.map((attr) => ({ ...attr })),
    nsDecls: element.nsDecls.map((decl) => ({ ...decl })),
    children: [],
    parent,
  };
  for (const child of element.children) {
    if (typeof child === "string") {
      copy.children.push(child);
      continue;
    }
    if (child.localName === "Signature" && elementNamespace(child) === DS_NS) continue;
    copy.children.push(withoutSignatures(child, copy));
  }
  return copy;
}

function readAttributes(assertion: XmlElement): SamlAttribute[] {
  const attributes: SamlAttribute[] = [];
  for (const attribute of elementsNamed(assertion, "Attribute", SAML_ASSERTION_NS)) {
    const name = attrValue(attribute, "Name");
    if (!name) continue;
    const value = directChildren(attribute, "AttributeValue", SAML_ASSERTION_NS)
      .map((node) => textContent(node).trim())
      .filter((item) => item !== "")
      .join(" ");
    attributes.push({ name, value });
    if (attributes.length >= 8) break;
  }
  return attributes;
}

function attributeElement(name: string, value: string): XmlElement {
  return xmlElement("saml:Attribute", {
    attrs: [xmlAttr("Name", name)],
    children: [xmlElement("saml:AttributeValue", { children: [value] })],
  });
}

function elementsNamed(root: XmlElement, localName: string, namespace: string): XmlElement[] {
  const found: XmlElement[] = [];
  const visit = (element: XmlElement) => {
    if (element.localName === localName && elementNamespace(element) === namespace) found.push(element);
    for (const child of element.children) {
      if (typeof child !== "string") visit(child);
    }
  };
  visit(root);
  return found;
}

function directChildren(element: XmlElement, localName: string, namespace: string): XmlElement[] {
  return element.children.filter(
    (child): child is XmlElement =>
      typeof child !== "string" && child.localName === localName && elementNamespace(child) === namespace,
  );
}

function attrValue(element: XmlElement, localName: string): string | null {
  const found = element.attrs.find((attr) => attr.prefix === "" && attr.localName === localName);
  return found ? found.value : null;
}

function textContent(element: XmlElement): string {
  let value = "";
  for (const child of element.children) value += typeof child === "string" ? child : textContent(child);
  return value;
}

function prefixList(element: XmlElement): string[] {
  const inclusive = directChildren(element, "InclusiveNamespaces", EXC_C14N)[0];
  const raw = inclusive ? attrValue(inclusive, "PrefixList") : null;
  if (!raw) return [];
  return raw
    .split(/\s+/)
    .filter((prefix) => prefix !== "")
    .map((prefix) => (prefix === "#default" ? "" : prefix));
}

function checkWindow(
  notBefore: string | null,
  notOnOrAfter: string | null,
  now: Date,
): "ok" | "expired" | "not_yet_valid" | "invalid_assertion" {
  if (!notOnOrAfter) return "invalid_assertion";
  const end = parseSamlTime(notOnOrAfter);
  if (!end) return "invalid_assertion";
  if (now.getTime() - SKEW_MS >= end.getTime()) return "expired";
  if (notBefore) {
    const start = parseSamlTime(notBefore);
    if (!start) return "invalid_assertion";
    if (now.getTime() + SKEW_MS < start.getTime()) return "not_yet_valid";
  }
  return "ok";
}

function parseSamlTime(value: string): Date | null {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(`${match[1]}${match[2] ?? ""}${match[3]}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatInstant(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function newId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `_${[...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function sha256Base64(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return bytesToBase64(digest);
}

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function escapeXml(value: string): string {
  return value.replace(/[&"<>]/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === '"') return "&quot;";
    if (char === "<") return "&lt;";
    return "&gt;";
  });
}

function isMime(contentType: string, expected: string): boolean {
  return (contentType.split(";")[0] ?? "").trim().toLowerCase() === expected;
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

function blankToNull(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function errorLocation(origin: string, reason: SamlFailureReason): string {
  const url = new URL("/settings/sso", origin);
  url.searchParams.set("saml", "error");
  url.searchParams.set("reason", reason);
  return url.toString();
}

function successLocation(
  origin: string,
  relayState: string,
  result: Extract<SamlVerification, { ok: true }>,
): string {
  const url = new URL(relayState, origin);
  if (url.origin !== new URL(origin).origin || !isSafeRelayState(relayState)) {
    return errorLocation(origin, "invalid_relay_state");
  }
  const nameId = displayField(result.nameId, 254);
  url.searchParams.set("saml", "success");
  if (nameId) url.searchParams.set("nameId", nameId);
  if (url.pathname === "/settings/sso") {
    url.searchParams.set("signed", "1");
    const issuer = displayField(result.issuer, 200);
    if (issuer) url.searchParams.set("issuer", issuer);
    for (const attribute of result.attributes) {
      const name = displayField(attribute.name, 40);
      const value = displayField(attribute.value, 80);
      if (!name || value == null || name.includes("=")) continue;
      url.searchParams.append("attr", `${name}=${value}`);
    }
  }
  return url.toString();
}

function displayField(value: string, max: number): string | null {
  if (value.length === 0 || value.length > max) return null;
  if (/[\u0000-\u001f\u007f<>"'`\\]/.test(value)) return null;
  return value;
}
