// Dummy SCIM bearer values for this testbed. The prefix is public.
// A value is generated in the browser and is not a committed secret.
export const SCIM_BEARER_PREFIX = "scim_test_token_"; // gitleaks:allow

export const SCIM_BEARER_PATTERN = /^scim_test_token_[A-Za-z0-9_-]{16,64}$/; // gitleaks:allow

export function generateScimTestToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let suffix = "";
  for (const byte of bytes) {
    suffix += byte.toString(16).padStart(2, "0");
  }
  return `${SCIM_BEARER_PREFIX}${suffix}`;
}
