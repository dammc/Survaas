#!/usr/bin/env bash
set -euo pipefail

if [[ $# -eq 0 ]]; then
  exit 0
fi

fail=0

for file in "$@"; do
  if [[ ! "$file" =~ ^(bin|lib)/.*\.ts$ ]]; then
    continue
  fi

  added_lines="$(git diff --cached --unified=0 -- "$file" | grep -E '^\+' | grep -Ev '^\+\+\+' || true)"
  if [[ -z "$added_lines" ]]; then
    continue
  fi

  # Check only newly added lines to avoid blocking on known legacy patterns.
  if echo "$added_lines" | grep -Eiq "(actions?|resources?)\s*:\s*\[[^]]*['\"]\*['\"]"; then
    echo "policy-check: wildcard IAM action/resource added in $file"
    fail=1
  fi

  if echo "$added_lines" | grep -Eiq "AnyPrincipal|Peer\.anyIpv4\(|0\.0\.0\.0/0"; then
    echo "policy-check: broad principal or ingress added in $file"
    fail=1
  fi

  if echo "$added_lines" | grep -Eiq "(adminPassword|password|secret|token|api[_-]?key)\s*[:=]\s*['\"][^'\"]+['\"]"; then
    echo "policy-check: hardcoded credential-like value added in $file"
    fail=1
  fi
done

if [[ "$fail" -ne 0 ]]; then
  echo "policy-check: commit blocked. If intentional, document risk and request human review."
fi

exit "$fail"
