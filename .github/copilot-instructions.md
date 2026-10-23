# Copilot instructions

This repository is a dummy BtoB SaaS admin testbed for browser automation and SSO/SAML testing. Do not add real personal information, real employee data, or production credentials.

## No server-side persistent PII or database

Do not store user-submitted data in a shared server database. Keep dummy state in browser memory or browser storage, or in stateless signed cookies, so one visitor cannot read another visitor's data.

## No secrets in code

Never commit API keys, private keys, tokens, or real certificates. Any SAML or SSO test key must be clearly marked dummy or self-signed for testing only, or generated dynamically. The prefilled login password is a published test fixture. Do not reuse it outside this testbed.

## SAML SP security

When implementing SAML endpoints:

- Prevent XXE. Disable external entities and DTD processing in every XML parser that reads SAML messages.
- Prevent open redirects. Accept `RelayState` only when it is a relative path that starts with a single `/`. Reject values that start with `//`, and reject absolute or external URLs.
- Prevent XSS. Do not render SAML assertion attributes with `dangerouslySetInnerHTML` or any other unescaped HTML.
- Verify the XML signature, and check the audience, recipient, and timestamps. Reject an assertion that fails any of those checks.

## Dependencies

Do not add unvetted packages. Keep the dependency set minimal.

The same rules are in `.cursor/rules/security.mdc`. Reporting is in `SECURITY.md`.
