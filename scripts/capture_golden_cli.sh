#!/usr/bin/env bash
# Records stdout of every canonical CLI invocation into packages/fixtures/cli/.
# Run BEFORE and AFTER refactoring tools/ to prove byte-identical behaviour.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-packages/fixtures/cli}"
PY="${PY:-./.venv/bin/python}"
mkdir -p "$OUT"
./scripts/golden_cli_cases.sh | while IFS='|' read -r name tool args; do
  [ -z "$name" ] && continue
  # shellcheck disable=SC2086
  "$PY" "tools/$tool" $args           > "$OUT/$name.txt" 2>&1 || echo "FAILED: $name" >&2
  # shellcheck disable=SC2086
  "$PY" "tools/$tool" $args --json    > "$OUT/$name.json" 2>&1 || true
  printf '  captured %s\n' "$name"
done
