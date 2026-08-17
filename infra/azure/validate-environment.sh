#!/usr/bin/env bash
set -euo pipefail

require_value() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    printf 'Missing required environment variable: %s\n' "$name" >&2
    exit 1
  fi
}

require_value AZURE_LOCATION
require_value AZURE_RESOURCE_GROUP
require_value AZURE_STATIC_WEB_APP_NAME
require_value AZURE_PUBLIC_SITE_URL

if [[ ! "$AZURE_RESOURCE_GROUP" =~ ^[A-Za-z0-9._()\-]{1,90}$ ]]; then
  printf 'Invalid AZURE_RESOURCE_GROUP.\n' >&2
  exit 1
fi

if [[ ! "$AZURE_STATIC_WEB_APP_NAME" =~ ^[A-Za-z0-9-]{2,40}$ ]]; then
  printf 'Invalid AZURE_STATIC_WEB_APP_NAME.\n' >&2
  exit 1
fi

if [[ ! "$AZURE_PUBLIC_SITE_URL" =~ ^https://[^[:space:]]+$ ]]; then
  printf 'Invalid AZURE_PUBLIC_SITE_URL.\n' >&2
  exit 1
fi

case "${AZURE_SITE_SKU:-Free}" in
  Free|Standard) ;;
  *) printf 'AZURE_SITE_SKU must be Free or Standard.\n' >&2; exit 1 ;;
esac
