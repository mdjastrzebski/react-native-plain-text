#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

finalize_ci_artifact() {
  local run_status=$?

  trap - EXIT
  set +e
  "$SCRIPT_DIR/collect-android-vrt-environment.sh"
  "$SCRIPT_DIR/finalize-android-vrt-artifact.sh"
  exit "$run_status"
}

trap finalize_ci_artifact EXIT

"$SCRIPT_DIR/configure-android-vrt-device.sh"
"$SCRIPT_DIR/verify-vrt-environment.sh" android
yarn vrt:android run

comparison_status=0
yarn vrt:android test || comparison_status=$?

exit "$comparison_status"
