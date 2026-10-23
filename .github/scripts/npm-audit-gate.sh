#!/usr/bin/env bash
# Run `npm audit --audit-level=high` and fail when a high or critical advisory
# is not listed in the baseline. The baseline is the pinned Next.js 16.2.4
# tree. This script does not change package.json or package-lock.json.
set -euo pipefail

baseline="${1:-.github/npm-audit-baseline.txt}"
report="$(mktemp)"
current="$(mktemp)"
sorted_baseline="$(mktemp)"
trap 'rm -f "$report" "$current" "$sorted_baseline"' EXIT

set +e
npm audit --audit-level=high --json >"$report"
status=$?
set -e

if [[ "$status" -eq 0 ]]; then
  echo "npm audit --audit-level=high passed with no high or critical advisories."
  exit 0
fi

if [[ "$status" -gt 1 ]]; then
  echo "npm audit --audit-level=high could not complete (exit ${status})." >&2
  exit "$status"
fi

if [[ ! -f "$baseline" ]]; then
  echo "Missing npm audit baseline: ${baseline}" >&2
  exit 1
fi

jq -r '
  [.vulnerabilities // {} | .[]?.via[]?
    | select(type == "object")
    | select(.severity == "high" or .severity == "critical")
    | .url // empty
    | select(test("GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}"))
    | sub(".*/"; "")]
  | unique
  | .[]
' "$report" | LC_ALL=C sort -u >"$current"

if [[ ! -s "$current" ]]; then
  echo "npm audit --audit-level=high exited 1, but no high or critical GHSA id could be read." >&2
  exit 1
fi

echo "npm audit --audit-level=high found these high and critical advisories:"
cat "$current"

LC_ALL=C sort -u "$baseline" >"$sorted_baseline"
new="$(comm -13 "$sorted_baseline" "$current")"
if [[ -n "$new" ]]; then
  echo "High or critical advisories that are not in ${baseline}:" >&2
  echo "$new" >&2
  exit 1
fi

echo "Every high or critical advisory is already listed in ${baseline}."
