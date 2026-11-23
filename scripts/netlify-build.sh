#!/usr/bin/env bash
set -euo pipefail
: "${VMS_API_URL:?Set VMS_API_URL to the deployed backend HTTPS URL ending in /api}"
case "$VMS_API_URL" in
  https://*/api) ;;
  *) printf '%s\n' 'VMS_API_URL must be an HTTPS address ending in /api' >&2; exit 1 ;;
esac
sdk_dir="/tmp/stark-vms-flutter-3.50.1"
if [ ! -d "$sdk_dir/.git" ]; then
  git clone --depth 1 --branch 3.50.1 https://github.com/flutter/flutter.git "$sdk_dir"
fi
"$sdk_dir/bin/flutter" pub get
"$sdk_dir/bin/flutter" build web --release --no-web-resources-cdn --dart-define="VMS_API_URL=$VMS_API_URL"
