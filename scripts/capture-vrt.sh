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
  printf 'Usage: %s <android|ios> [--filter <substring>[,...]] [--limit <n>] [--out <dir>]\n' \
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
out_dir="${VRT_ACTUAL_DIR:-}"
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
    --out)
      [[ $# -ge 2 ]] || fail "--out needs a directory."
      out_dir="$2"
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

manifest="$PROJECT_ROOT/.agent-device/vrt-captures.txt"
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

if [[ -n "$out_dir" ]]; then
  [[ "$out_dir" == /* ]] || out_dir="$PROJECT_ROOT/$out_dir"
  # This stage replaces its output directory outright, so the target has to be a
  # plain leaf below an existing parent: never a traversal, and inside the
  # repository only under build/, where nothing reviewed lives.
  out_leaf="${out_dir##*/}"
  if [[ ! "$out_leaf" =~ ^[A-Za-z0-9._-]*[A-Za-z0-9][A-Za-z0-9._-]*$ || "$out_leaf" == "." || "$out_leaf" == ".." ]]; then
    fail "--out must name a plain directory, not '$out_dir'."
  fi
  [[ -d "${out_dir%/*}" ]] || fail "--out parent '${out_dir%/*}' does not exist."
  case "$out_dir/" in
    "$PROJECT_ROOT/build/"*) ;;
    "$PROJECT_ROOT/"*) fail \
      "--out inside the repository must live under build/, not '$out_dir'." ;;
  esac
  actual_dir="$out_dir"
else
  actual_dir="$PROJECT_ROOT/build/vrt/actual/$platform"
fi

# Investigation knobs, all off by default. The capture loop used to buy its
# "nothing is still moving" guarantee from `wait stable`, which costs two more
# accessibility-tree fetches per specimen; these switches put that guarantee back
# so a reviewer can prove the cheaper default renders the same bytes.
settle_ms="${VRT_SETTLE_MS:-0}"
stable_quiet_ms="${VRT_STABLE_QUIET_MS:-0}"
stable_timeout_ms="${VRT_STABLE_TIMEOUT_MS:-5000}"
capture_attempts="${VRT_CAPTURE_ATTEMPTS:-5}"
# Android stabilizes the status bar and demo-mode chrome before a screenshot.
# Every capture is cropped to the specimen's own frame, so that chrome never
# reaches a pixel, and the animations stabilization guards are already switched
# off (scripts/setup-android-vrt-device.sh). VRT_ANDROID_STABILIZE=1 restores it.
android_stabilize="${VRT_ANDROID_STABILIZE:-0}"
timing="${VRT_TIMING:-0}"
timings_dir="$PROJECT_ROOT/build/vrt/timings"
timings_file="$timings_dir/$platform.tsv"

[[ "$limit" =~ ^[1-9][0-9]*$ || -z "$limit" ]] || fail "--limit must be a positive integer."
[[ "$settle_ms" =~ ^[0-9]+$ ]] || fail "VRT_SETTLE_MS must be a non-negative integer."
[[ "$stable_quiet_ms" =~ ^[0-9]+$ ]] || fail "VRT_STABLE_QUIET_MS must be a non-negative integer."
[[ "$capture_attempts" =~ ^[1-9][0-9]*$ ]] || fail "VRT_CAPTURE_ATTEMPTS must be a positive integer."

"$SCRIPT_DIR/vrt-app-state.sh" verify-installed "$platform"
[[ -x "$agent_device_bin" ]] || fail "agent-device is not installed. Run 'yarn'."
[[ -f "$manifest" ]] || fail "Capture manifest not found at $manifest."
case "$platform" in
  android)
    target_file="$PROJECT_ROOT/build/vrt/devices/android-serial"
    [[ -f "$target_file" ]] || fail "Run 'yarn vrt android setup' first."
    target_args=(--platform android --serial "$(<"$target_file")")
    ;;
  ios)
    target_file="$PROJECT_ROOT/build/vrt/devices/ios-udid"
    [[ -f "$target_file" ]] || fail "Run 'yarn vrt ios setup' first."
    target_args=(--platform ios --udid "$(<"$target_file")")
    ;;
esac

# Refresh the metadata that comparison binds to these captures. Keeping this in
# the capture stage makes a standalone capture as trustworthy as the full VRT
# workflow, without making the cheap compare stage require a running device.
"$SCRIPT_DIR/verify-vrt-environment.sh" "$platform" >/dev/null

if [[ "$timing" == "1" ]]; then
  command -v jq >/dev/null 2>&1 || fail "VRT_TIMING=1 needs jq. Install jq or unset VRT_TIMING."
  mkdir -p "$timings_dir"
  printf 'capture_id\tstep\twall_clock_ms\trunner_round_trips\tstatus\n' > "$timings_file"
fi

agent_device() {
  AGENT_DEVICE_SESSION="$session_name" "$agent_device_bin" "$@" "${target_args[@]}"
}

# The response carries the daemon-side clock under `data.cost` for the commands that
# measure themselves (`wait`, `screenshot`), and under `data.startup` for `open`,
# whose cost is the app round trip rather than a runner interaction. Reading both
# keeps one column comparable across steps; a step whose command reports neither is
# recorded as n/a rather than as a zero that would quietly flatter the loop.
step_metrics() {
  jq -r '
    [ (.data.cost.wallClockMs // .cost.wallClockMs
       // .data.startup.durationMs // .startup.durationMs
       // "n/a"),
      (.data.cost.runnerRoundTrips // .cost.runnerRoundTrips // "" | tostring)
    ] | @tsv
  ' "$1" 2>/dev/null
}

# One device round trip per call, measured on demand. The split is the point: this
# is what separates opening the deep link from the accessibility fetches, instead
# of blaming the loop as a whole.
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

# A filtered capture is a partial capture: it must never be mistaken for a
# complete one, because only a complete set may become a baseline.
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

# `--out` targets are outside the repository by design, and del-cli guards against
# deleting outside the working directory unless told the target is deliberate. The
# leaf, parent, and repository checks above are that instruction.
if [[ "$actual_dir" == "$PROJECT_ROOT/build/vrt/actual/$platform" ]]; then
  yarn del-cli "$actual_dir"
else
  yarn del-cli --force "$actual_dir"
fi
mkdir -p "$actual_dir"
if [[ "$requested_selection" != "all" ]]; then
  printf '%s\n' "$requested_selection" > "$partial_marker"
fi

selected=0
captured=0
while read -r capture_platform capture_id extra; do
  [[ -z "$capture_platform" || "$capture_platform" == "#"* ]] && continue
  [[ -z "$extra" ]] || fail "Invalid capture manifest line for '$capture_id'."
  [[ "$capture_platform" == "all" || "$capture_platform" == "$platform" ]] || continue
  capture_selected "$capture_id" || continue
  if [[ -n "$limit" && "$selected" -ge "$limit" ]]; then
    break
  fi
  selected=$((selected + 1))

  printf 'Capturing %s\n' "$capture_id"
  step_capture_id="$capture_id"
  deep_link="$VRT_APP_SCHEME://vrt?testID=$capture_id"
  step open open "$VRT_APP_ID" "$deep_link" --foreground
  session_open=1

  # One accessibility fetch proves the specimen exists. The `wait stable` that
  # used to follow it is gone: the crop below resolves the very same selector on
  # the same screen, so a specimen that is present and laid out is proven where
  # it is used rather than twice more before it.
  step wait wait "id=\"$capture_id\"" 15000
  if [[ "$stable_quiet_ms" != "0" ]]; then
    step stable wait stable "$stable_quiet_ms" "$stable_timeout_ms"
  fi
  if [[ "$settle_ms" != "0" ]]; then
    step settle wait "$settle_ms"
  fi

  screenshot_command=(
    screenshot
    "$actual_dir/$capture_id.png"
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
done < "$manifest"

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

if [[ "$captured" -lt "$selected" ]]; then
  printf 'VRT captures: %s (%s of %s selected)\n' "$actual_dir" "$captured" "$selected"
else
  printf 'VRT captures: %s (%s)\n' "$actual_dir" "$captured"
fi
if [[ "$requested_selection" != "all" ]]; then
  printf 'Partial capture set: compare with "yarn vrt %s compare partial".\n' "$platform"
fi
