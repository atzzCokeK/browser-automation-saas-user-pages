import assert from "node:assert/strict";
import { isSafeRelayState } from "../src/saml/shared.ts";
import {
  buildMetadata,
  consumeAssertionConsumer,
  createAuthnRequest,
  createPublicTestResponse,
  createTestSamlResponse,
  verifySamlResponse,
} from "../src/worker/saml.ts";
import { exclusiveCanonicalize, parseXml } from "../src/worker/xml.ts";

const origin = "http://localhost:3000";
const urls = {
  entityId: `${origin}/api/saml/metadata`,
  acsUrl: `${origin}/api/saml/acs`,
};

function formBody(fields: Record<string, string>): Uint8Array {
  return new TextEncoder().encode(new URLSearchParams(fields).toString());
}

const canonical = exclusiveCanonicalize(parseXml(`<foo:Bar Attr="value" xmlns:foo="http://example.org"/>`));
assert.equal(canonical, `<foo:Bar xmlns:foo="http://example.org" Attr="value"></foo:Bar>`);
assert.equal(exclusiveCanonicalize(parseXml(`<e b="2" a="1"/>`)), `<e a="1" b="2"></e>`);
assert.equal(exclusiveCanonicalize(parseXml(`<e>a&amp;b&lt;c</e>`)), `<e>a&amp;b&lt;c</e>`);

const metadata = buildMetadata(origin);
assert.match(metadata, new RegExp(`entityID="${urls.entityId}"`));
assert.match(metadata, /Binding="urn:oasis:names:tc:SAML:2\.0:bindings:HTTP-POST"/);
assert.match(metadata, new RegExp(`Location="${urls.acsUrl}"`));
assert.match(metadata, /urn:oasis:names:tc:SAML:1\.1:nameid-format:emailAddress/);
parseXml(metadata.replace(/^<\?xml[^>]*>/, ""));

const created = await createTestSamlResponse({ origin, now: new Date("2026-10-23T12:00:00Z") });
const verified = await verifySamlResponse(created.xml, {
  entityId: urls.entityId,
  acsUrl: urls.acsUrl,
  now: new Date("2026-10-23T12:00:00Z"),
  pinnedCertificatePem: created.certificatePem,
  pinnedIssuer: created.idpEntityId,
});
assert.equal(verified.ok, true);
if (verified.ok) {
  assert.equal(verified.nameId, "admin@example.com");
  assert.equal(verified.signed, true);
  assert.equal(verified.attributes.some((attribute) => attribute.name === "email"), true);
}

const tampered = created.xml.replace("admin@example.com", "other@example.com");
const tamperedResult = await verifySamlResponse(tampered, {
  entityId: urls.entityId,
  acsUrl: urls.acsUrl,
  now: new Date("2026-10-23T12:00:00Z"),
});
assert.deepEqual(tamperedResult, { ok: false, reason: "signature_invalid" });

const wrongAudience = await createTestSamlResponse({
  origin,
  audience: "urn:example:other-sp",
  selfCheck: false,
  now: new Date("2026-10-23T12:00:00Z"),
});
const audienceResult = await verifySamlResponse(wrongAudience.xml, {
  entityId: urls.entityId,
  acsUrl: urls.acsUrl,
  now: new Date("2026-10-23T12:00:00Z"),
});
assert.deepEqual(audienceResult, { ok: false, reason: "audience_mismatch" });

const wrongRecipient = await createTestSamlResponse({
  origin,
  recipient: "https://evil.example/acs",
  selfCheck: false,
  now: new Date("2026-10-23T12:00:00Z"),
});
const recipientResult = await verifySamlResponse(wrongRecipient.xml, {
  entityId: urls.entityId,
  acsUrl: urls.acsUrl,
  now: new Date("2026-10-23T12:00:00Z"),
});
assert.equal(recipientResult.ok, false);
if (!recipientResult.ok) assert.equal(recipientResult.reason, "recipient_mismatch");

const expired = await createTestSamlResponse({
  origin,
  notOnOrAfter: "2026-10-23T11:00:00Z",
  selfCheck: false,
  now: new Date("2026-10-23T12:00:00Z"),
});
const expiredResult = await verifySamlResponse(expired.xml, {
  entityId: urls.entityId,
  acsUrl: urls.acsUrl,
  now: new Date("2026-10-23T12:00:00Z"),
});
assert.deepEqual(expiredResult, { ok: false, reason: "expired" });

const xxe = await verifySamlResponse(
  `<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>`,
  { entityId: urls.entityId, acsUrl: urls.acsUrl, now: new Date() },
);
assert.deepEqual(xxe, { ok: false, reason: "xxe_forbidden" });

const unsigned = created.xml.replace(/<ds:Signature[\s\S]*<\/ds:Signature>/, "");
const unsignedResult = await verifySamlResponse(unsigned, {
  entityId: urls.entityId,
  acsUrl: urls.acsUrl,
  now: new Date("2026-10-23T12:00:00Z"),
});
assert.deepEqual(unsignedResult, { ok: false, reason: "signature_missing" });

assert.equal(isSafeRelayState("/dashboard"), true);
assert.equal(isSafeRelayState("/settings/sso"), true);
assert.equal(isSafeRelayState("//evil.example"), false);
assert.equal(isSafeRelayState("https://evil.example"), false);
assert.equal(isSafeRelayState("/\\evil.example"), false);
assert.equal(isSafeRelayState("/%2F/evil.example"), false);

const fresh = await createTestSamlResponse({ origin });

const success = await consumeAssertionConsumer({
  origin,
  contentType: "application/x-www-form-urlencoded",
  cookie: null,
  body: formBody({ SAMLResponse: fresh.samlResponse, RelayState: "/settings/sso" }),
});
const successUrl = new URL(success);
assert.equal(successUrl.pathname, "/settings/sso");
assert.equal(successUrl.searchParams.get("saml"), "success");
assert.equal(successUrl.searchParams.get("nameId"), "admin@example.com");
assert.equal(successUrl.searchParams.get("signed"), "1");

const dashboard = await consumeAssertionConsumer({
  origin,
  contentType: "application/x-www-form-urlencoded",
  cookie: null,
  body: formBody({ SAMLResponse: fresh.samlResponse, RelayState: "/dashboard" }),
});
assert.equal(new URL(dashboard).pathname, "/dashboard");

const openRedirect = await consumeAssertionConsumer({
  origin,
  contentType: "application/x-www-form-urlencoded",
  cookie: `saml_enforce=1; saml_idp_cert=${encodeURIComponent(fresh.certificatePem)}`,
  body: formBody({ SAMLResponse: fresh.samlResponse, RelayState: "https://evil.example/phish" }),
});
assert.equal(new URL(openRedirect).searchParams.get("reason"), "invalid_relay_state");

const pinned = await consumeAssertionConsumer({
  origin,
  contentType: "application/x-www-form-urlencoded",
  cookie: `saml_enforce=1; saml_idp_cert=${encodeURIComponent(fresh.certificatePem)}; saml_idp_entity=${encodeURIComponent(fresh.idpEntityId)}`,
  body: formBody({ SAMLResponse: fresh.samlResponse, RelayState: "/settings/sso" }),
});
assert.equal(new URL(pinned).searchParams.get("saml"), "success");

const mismatch = await consumeAssertionConsumer({
  origin,
  contentType: "application/x-www-form-urlencoded",
  cookie: "saml_enforce=1; saml_idp_cert=not-a-cert",
  body: formBody({ SAMLResponse: fresh.samlResponse }),
});
assert.equal(new URL(mismatch).searchParams.get("reason"), "idp_cert_invalid");

const tooLarge = await consumeAssertionConsumer({
  origin,
  contentType: "application/x-www-form-urlencoded",
  cookie: null,
  body: "too_large",
});
assert.equal(new URL(tooLarge).searchParams.get("reason"), "payload_too_large");

const login = await createAuthnRequest(origin);
assert.equal(typeof login.samlRequest, "string");
assert.equal(login.relayState, "/dashboard");
const inflated = await new Response(
  new Blob([Uint8Array.from(atob(login.samlRequest), (char) => char.charCodeAt(0))]).stream().pipeThrough(
    new DecompressionStream("deflate-raw"),
  ),
).text();
assert.match(inflated, /samlp:AuthnRequest/);
assert.match(inflated, new RegExp(urls.acsUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

const generated = await createPublicTestResponse({
  origin,
  contentType: "application/json",
  body: new TextEncoder().encode(JSON.stringify({ nameId: "admin@example.com" })),
});
assert.equal(generated.status, 200);
assert.equal(typeof generated.body.samlResponse, "string");
assert.match(generated.body.certificatePem, /BEGIN CERTIFICATE/);
assert.equal(generated.body.samlResponse.includes("PRIVATE"), false);

const badRelay = await createPublicTestResponse({
  origin,
  contentType: "application/json",
  body: new TextEncoder().encode(JSON.stringify({ relayState: "//evil.example" })),
});
assert.equal(badRelay.status, 400);
assert.equal(badRelay.body.error, "invalid_relay_state");

console.log("saml checks passed");
