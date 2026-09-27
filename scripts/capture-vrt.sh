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

filter="${VRT_CAPTURE_FILTER:-}"
limit="${VRT_CAPTURE_LIMIT:-}"
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
step_capture_id=unknown
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

# Investigation knobs, off by default. They restore the `wait stable` guarantee
# (two more accessibility fetches per specimen) to prove the cheaper default
# renders the same bytes.
settle_ms="${VRT_SETTLE_MS:-0}"
stable_quiet_ms="${VRT_STABLE_QUIET_MS:-0}"
stable_timeout_ms="${VRT_STABLE_TIMEOUT_MS:-5000}"
capture_attempts="${VRT_CAPTURE_ATTEMPTS:-5}"
# Android's pre-screenshot chrome stabilization is off: captures are cropped to
# the specimen, and setup-android-vrt-device.sh already disables animations.
android_stabilize="${VRT_ANDROID_STABILIZE:-0}"
timing="${VRT_TIMING:-0}"
# Report each capture's verdict as it is taken, not only at the compare stage.
live_compare="${VRT_LIVE_COMPARE:-1}"
live_diff_dir="$PROJECT_ROOT/.vrt/live-diff/$target"
case "$platform" in
  android) live_matching_threshold="$ANDROID_VRT_MATCHING_THRESHOLD" ;;
  *) live_matching_threshold="$IOS_VRT_MATCHING_THRESHOLD" ;;
esac
timings_dir="$PROJECT_ROOT/.vrt/timings"
timings_file="$timings_dir/$target.tsv"

[[ "$limit" =~ ^[1-9][0-9]*$ || -z "$limit" ]] || fail "--limit must be a positive integer."
[[ "$settle_ms" =~ ^[0-9]+$ ]] || fail "VRT_SETTLE_MS must be a non-negative integer."
[[ "$stable_quiet_ms" =~ ^[0-9]+$ ]] || fail "VRT_STABLE_QUIET_MS must be a non-negative integer."
[[ "$capture_attempts" =~ ^[1-9][0-9]*$ ]] || fail "VRT_CAPTURE_ATTEMPTS must be a positive integer."

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

if [[ "$timing" == "1" ]]; then
  command -v jq >/dev/null 2>&1 || fail "VRT_TIMING=1 needs jq. Install jq or unset VRT_TIMING."
  mkdir -p "$timings_dir"
  printf 'capture_id\tstep\twall_clock_ms\trunner_round_trips\tstatus\n' > "$timings_file"
fi

agent_device() {
  AGENT_DEVICE_SESSION="$session_name" "$agent_device_bin" "$@" "${target_args[@]}"
}

# `wait` and `screenshot` report daemon-side cost under `data.cost`; `open`
# reports `data.startup`. A step with neither is n/a, not a flattering zero.
step_metrics() {
  jq -r '
    [ (.data.cost.wallClockMs // .cost.wallClockMs
       // .data.startup.durationMs // .startup.durationMs
       // "n/a"),
      (.data.cost.runnerRoundTrips // .cost.runnerRoundTrips // "" | tostring)
    ] | @tsv
  ' "$1" 2>/dev/null
}

# One measured device round trip, so deep-link opens and accessibility fetches
# are timed separately.
step() {
  local label="$1"
  shift
  if [[ "$timing" == "1" ]]; then
    local step_json="$timings_dir/last-$label.json"
    local step_stderr="$timings_dir/last-$label.err"
    local status=ok metrics
    if ! agent_device --json --cost --level digest "$@" >"$step_json" 2>"$step_stderr"; then
      status=failed
    fi
    metrics="$(step_metrics "$step_json")"
    [[ -n "$metrics" ]] || metrics="$(printf 'n/a\t')"
    printf '%s\t%s\t%s\t%s\n' "$step_capture_id" "$label" "$metrics" "$status" \
      >> "$timings_file"
    if [[ "$status" == "failed" ]]; then
      cat "$step_stderr" >&2
      return 1
    fi
  else
    agent_device --level digest "$@" >/dev/null
  fi
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

yarn del-cli "$actual_dir"
mkdir -p "$actual_dir"
if [[ "$live_compare" == "1" ]]; then
  yarn del-cli "$live_diff_dir"
fi
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

  # With live comparison the verdict is the capture's only line. At a terminal a
  # pending line stands in for it until the verdict overwrites it.
  if [[ "$live_compare" != "1" ]]; then
    printf 'Capturing %s\n' "$capture_id"
  elif [[ -t 1 ]]; then
    printf '⏳ %s' "$capture_id"
  fi
  step_capture_id="$capture_id"
  deep_link="$VRT_APP_SCHEME://vrt?testID=$capture_id"
  step open open "$VRT_APP_ID" "$deep_link" --foreground
  session_open=1

  # One accessibility fetch proves the specimen exists. No `wait stable`: the crop
  # below resolves the same selector on the same screen.
  step wait wait "id=\"$capture_id\"" 15000
  if [[ "$stable_quiet_ms" != "0" ]]; then
    step stable wait stable "$stable_quiet_ms" "$stable_timeout_ms"
  fi
  if [[ "$settle_ms" != "0" ]]; then
    step settle wait "$settle_ms"
  fi

  # Files drop the ID's `vrt-` prefix; compare-vrt.sh derives the same names.
  image="${capture_id#vrt-}.png"
  screenshot_command=(
    screenshot
    "$actual_dir/$image"
    --crop-on "id=\"$capture_id\""
  )
  if [[ "$platform" == "ios" ]]; then
    screenshot_command+=(--pixel-density "$IOS_VRT_PIXEL_DENSITY")
  elif [[ "$android_stabilize" != "1" ]]; then
    screenshot_command+=(--no-stabilize)
  fi

  attempt=1
  while true; do
    if step screenshot "${screenshot_command[@]}"; then
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
  if [[ "$live_compare" == "1" ]]; then
    [[ -t 1 ]] && printf '\r\033[K'
    node "$SCRIPT_DIR/vrt-live-compare.js" \
      "$actual_dir/$image" \
      "$PROJECT_ROOT/tests/vrt/$target/$image" \
      "$live_diff_dir/$image" \
      "$live_matching_threshold" \
      "$VRT_THRESHOLD_PIXEL" || true
  fi
done < "$scenario_list"

[[ "$captured" -gt 0 ]] || fail \
  "No capture matched the selection ($requested_selection) on $platform."

agent_device close >/dev/null
session_open=0

if [[ "$timing" == "1" ]]; then
  awk -F '\t' '
    NR > 1 && $3 ~ /^[0-9.]+$/ { total += $3; n++ }
    END {
      if (n) printf "Measured %d steps, %.0f ms total, %.0f ms per step.\n", n, total, total / n
    }
  ' "$timings_file"
  printf 'VRT step timings: %s\n' "$timings_file"
fi

printf 'VRT captures: %s (%s)\n' "$actual_dir" "$captured"
if [[ "$requested_selection" != "all" ]]; then
  printf 'Partial capture set: compare with "yarn vrt %s compare partial".\n' "$platform"
fi
