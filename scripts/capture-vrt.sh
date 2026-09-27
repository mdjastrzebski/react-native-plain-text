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

usage() {
  printf 'Usage: %s <android|ios> [--filter <substring>[,...]] [--limit <n>]\n' \
    "${0##*/}" >&2
}

platform="${1:-}"
case "$platform" in
  -h | --help)
    usage
    exit 0
    ;;
esac
shift || true

filter=""
limit=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --filter)
      [[ $# -ge 2 ]] || fail "--filter needs a value."
      filter="$2"
      shift 2
      ;;
    --limit)
      [[ $# -ge 2 ]] || fail "--limit needs a number."
      limit="$2"
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      usage
      fail "Unknown argument '$1'."
      ;;
  esac
done

session_name="plaintext-vrt-capture-$platform"
session_open=0
agent_device_bin="$PROJECT_ROOT/node_modules/.bin/agent-device"

case "$platform" in
  android | ios) ;;
  *)
    usage
    fail "Platform must be 'android' or 'ios'."
    ;;
esac
target="$(vrt_target "$platform")"

actual_dir="$PROJECT_ROOT/.vrt/actual/$target"

capture_attempts=5
# Each capture's verdict is reported as it is taken, not only at the compare stage.
live_diff_dir="$PROJECT_ROOT/.vrt/live-diff/$target"
case "$platform" in
  android) live_matching_threshold="$ANDROID_VRT_MATCHING_THRESHOLD" ;;
  *) live_matching_threshold="$IOS_VRT_MATCHING_THRESHOLD" ;;
esac

[[ "$limit" =~ ^[1-9][0-9]*$ || -z "$limit" ]] || fail "--limit must be a positive integer."

"$SCRIPT_DIR/vrt-app-state.sh" verify-installed "$platform"
[[ -x "$agent_device_bin" ]] || fail "agent-device is not installed. Run 'yarn'."
scenario_list="$("$SCRIPT_DIR/list-vrt-scenarios.sh" "$platform")"
case "$platform" in
  android)
    target_file="$PROJECT_ROOT/.vrt/devices/android-serial"
    [[ -f "$target_file" ]] || fail "Run 'yarn vrt android setup' first."
    target_args=(--platform android --serial "$(<"$target_file")")
    ;;
  ios)
    target_file="$PROJECT_ROOT/.vrt/devices/ios-udid"
    [[ -f "$target_file" ]] || fail "Run 'yarn vrt ios setup' first."
    target_args=(--platform ios --udid "$(<"$target_file")")
    ;;
esac

"$SCRIPT_DIR/apply-vrt-text-size.sh" "$platform"
# Refreshed here so a standalone capture is as trustworthy as a full run, while
# compare stays runnable without a device.
"$SCRIPT_DIR/verify-vrt-environment.sh" "$platform" >/dev/null

agent_device() {
  AGENT_DEVICE_SESSION="$session_name" "$agent_device_bin" "$@" "${target_args[@]}"
}

step() {
  agent_device --level digest "$@" >/dev/null
}

close_session() {
  if [[ "$session_open" == "1" ]]; then
    agent_device close >/dev/null 2>&1 || true
  fi
}
trap close_session EXIT

# A filtered capture is marked partial: only a complete set may become a baseline.
partial_marker="$actual_dir/.partial"
requested_selection="all"
if [[ -n "$filter" || -n "$limit" ]]; then
  requested_selection="filter=${filter:-all} limit=${limit:-none}"
fi

capture_selected() {
  local capture_id="$1"
  local pattern
  [[ -z "$filter" ]] && return 0
  local IFS=','
  for pattern in $filter; do
    [[ -z "$pattern" ]] && continue
    [[ "$capture_id" == *"$pattern"* ]] && return 0
  done
  return 1
}

yarn del-cli "$actual_dir" "$live_diff_dir"
mkdir -p "$actual_dir"
if [[ "$requested_selection" != "all" ]]; then
  printf '%s\n' "$requested_selection" > "$partial_marker"
fi

selected=0
captured=0
while read -r capture_id; do
  capture_selected "$capture_id" || continue
  if [[ -n "$limit" && "$selected" -ge "$limit" ]]; then
    break
  fi
  selected=$((selected + 1))

  # The verdict is the capture's only line. At a terminal a pending line stands
  # in for it until the verdict overwrites it.
  [[ -t 1 ]] && printf '⏳ %s' "$capture_id"
  deep_link="$VRT_APP_SCHEME://vrt?testID=$capture_id"
  step open "$VRT_APP_ID" "$deep_link" --foreground
  session_open=1

  # One accessibility fetch proves the specimen exists. No `wait stable`: the crop
  # below resolves the same selector on the same screen.
  step wait "id=\"$capture_id\"" 15000

  # Files drop the ID's `vrt-` prefix; compare-vrt.sh derives the same names.
  image="${capture_id#vrt-}.png"
  screenshot_command=(
    screenshot
    "$actual_dir/$image"
    --crop-on "id=\"$capture_id\""
  )
  # Android's pre-screenshot chrome stabilization is skipped: captures are cropped
  # to the specimen, and setup-android-vrt-device.sh already disables animations.
  if [[ "$platform" == "ios" ]]; then
    screenshot_command+=(--pixel-density "$IOS_VRT_PIXEL_DENSITY")
  else
    screenshot_command+=(--no-stabilize)
  fi

  attempt=1
  while true; do
    if step "${screenshot_command[@]}"; then
      break
    fi
    if [[ "$attempt" -ge "$capture_attempts" ]]; then
      fail "Capturing '$capture_id' failed after $attempt attempts."
    fi
    printf 'Capture of %s failed (attempt %s/%s); retrying.\n' \
      "$capture_id" "$attempt" "$capture_attempts" >&2
    attempt=$((attempt + 1))
    sleep 0.2
  done
  captured=$((captured + 1))
  [[ -t 1 ]] && printf '\r\033[K'
  node "$SCRIPT_DIR/vrt-live-compare.js" \
    "$actual_dir/$image" \
    "$PROJECT_ROOT/tests/vrt/$target/$image" \
    "$live_diff_dir/$image" \
    "$live_matching_threshold" \
    "$VRT_THRESHOLD_PIXEL" || true
done < "$scenario_list"

[[ "$captured" -gt 0 ]] || fail \
  "No capture matched the selection ($requested_selection) on $platform."

agent_device close >/dev/null
session_open=0

printf 'VRT captures: %s (%s)\n' "$actual_dir" "$captured"
if [[ "$requested_selection" != "all" ]]; then
  printf 'Partial capture set: compare with "yarn vrt %s compare partial".\n' "$platform"
fi
