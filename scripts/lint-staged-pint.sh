#!/usr/bin/env sh
# Runs Laravel Pint against staged PHP files inside website/backend.
# - Uses the dockerized backend container if it is running so contributors
#   don't need PHP installed on the host.
# - Falls back to a local `vendor/bin/pint` if `composer install` was run on the host.
# - Skips silently with a hint otherwise.

set -e

if [ "$#" -eq 0 ]; then
  exit 0
fi

# Convert the absolute paths lint-staged provides into paths relative to
# website/backend, since that is Pint's working directory.
relative_paths=""
for f in "$@"; do
  case "$f" in
    */website/backend/*)
      rel="${f##*/website/backend/}"
      relative_paths="$relative_paths $rel"
      ;;
  esac
done

if [ -z "$relative_paths" ]; then
  exit 0
fi

# Prefer the running container so the same PHP/Pint version is used everywhere.
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q '^envault-backend$'; then
  # shellcheck disable=SC2086
  docker exec -i envault-backend ./vendor/bin/pint --test $relative_paths
  exit $?
fi

if [ -x website/backend/vendor/bin/pint ]; then
  cd website/backend
  # shellcheck disable=SC2086
  ./vendor/bin/pint --test $relative_paths
  exit $?
fi

echo "[husky] Pint not available (container not running and vendor/ missing on host)."
echo "[husky] Skipping PHP lint. Run \`docker compose up -d envault-backend\` or \`composer install\` to enable."
exit 0
