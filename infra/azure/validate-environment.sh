#!/usr/bin/env bash
# Shared checks live in the vendored pawprint script; only the workload-specific
# requirements stay here.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"

PAWPRINT_REQUIRE="AZURE_STATIC_WEB_APP_NAME AZURE_PUBLIC_SITE_URL" \
  bash "${repo_root}/vendor/pawprint/scripts/validate-environment.sh"
