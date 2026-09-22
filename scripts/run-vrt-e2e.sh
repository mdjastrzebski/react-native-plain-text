#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=./vrt-config.sh
source "$SCRIPT_DIR/vrt-config.sh"

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

platform="${1:-}"
capture_id="${VRT_E2E_CAPTURE_ID:-vrt-capture-features-font-size-48}"
session_name="plaintext-vrt-e2e-$platform"
agent_device_bin="$PROJECT_ROOT/node_modules/.bin/agent-device"

"$SCRIPT_DIR/vrt-app-state.sh" verify-installed "$platform"
"$SCRIPT_DIR/verify-vrt-environment.sh" "$platform"
[[ -x "$agent_device_bin" ]] || fail "agent-device is not installed. Run 'yarn'."
[[ -x "$PROJECT_ROOT/node_modules/.bin/appduct" ]] || fail "appduct is not installed. Run 'yarn'."

case "$platform" in
  android)
    target_file="$PROJECT_ROOT/build/vrt/devices/android-serial"
    [[ -f "$target_file" ]] || fail "Run 'yarn vrt android setup' first."
    target_args=(--serial "$(<"$target_file")")
    ;;
  ios)
    target_file="$PROJECT_ROOT/build/vrt/devices/ios-udid"
    [[ -f "$target_file" ]] || fail "Run 'yarn vrt ios setup' first."
    target_args=(--udid "$(<"$target_file")")
    ;;
  *) fail "Platform must be 'android' or 'ios'." ;;
esac

agent_device() {
  AGENT_DEVICE_SESSION="$session_name" "$agent_device_bin" "$@" "${target_args[@]}"
}

# shellcheck source=./vrt-appduct.sh
source "$SCRIPT_DIR/vrt-appduct.sh"

report_dir="$PROJECT_ROOT/build/vrt/report"
diagnostics_dir="$PROJECT_ROOT/build/vrt/agent-device/$platform/e2e"
junit_file="$report_dir/$platform-e2e.xml"
mkdir -p "$report_dir" "$diagnostics_dir"

write_junit() {
  local failures="$1"
  {
    printf '<?xml version="1.0" encoding="UTF-8"?>\n'
    printf '<testsuites name="%s-e2e" tests="1" failures="%s">\n' "$platform" "$failures"
    printf '  <testcase classname="vrt.appduct" name="%s appduct specimen switch">' "$platform"
    [[ "$failures" == "0" ]] ||
      printf '<failure message="Appduct connect or specimen switch failed"/>'
    printf '</testcase>\n'
    printf '</testsuites>\n'
  } >"$junit_file"
}

# Fail path leaves an artifact set that says exactly what the device did, and a junit
# that reports the e2e case as failed rather than absent.
on_error() {
  write_junit 1 || true
  agent_device screenshot "$diagnostics_dir/failure.png" >/dev/null 2>&1 || true
}
trap on_error ERR

if [[ "$platform" == "ios" ]]; then
  agent_device prepare ios-runner
fi

# The VRT harness now selects specimens through Appduct rather than a deep link, so the
# e2e gate proves that plumbing end to end: connect a session, read the specimen list,
# and render one specimen and see it on screen.
appduct_connect "$platform"

specimen_json="$(appduct_invoke get_specimen '{}' --json)"
printf '%s\n' "$specimen_json" >"$diagnostics_dir/get_specimen.json"
specimen_query='(.ok == true) and (((.data.result? // .data).specimenCount) > 0) and (((.data.result? // .data).testIDs // []) | index("'"$capture_id"'") != null)'
if ! printf '%s' "$specimen_json" | jq -e "$specimen_query" >/dev/null; then
  fail "get_specimen did not report '$capture_id' among the available specimens; see $diagnostics_dir/get_specimen.json"
fi

appduct_invoke show_specimen "{\"testID\":\"$capture_id\"}" >/dev/null
agent_device wait "id=\"$capture_id\"" 15000
agent_device wait stable 200 5000
agent_device close
appduct_disconnect

write_junit 0
printf 'VRT e2e passed on %s: Appduct rendered specimen %s.\n' "$platform" "$capture_id"
