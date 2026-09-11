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
actual_dir="${2:-}"
capture_manifest="$PROJECT_ROOT/.agent-device/vrt-captures.txt"
app_id="plaintext.example"
session_name="plaintext-vrt-$platform"
dev_capture_id="vrt-capture-features-font-size-48"
dev_mode="${VRT_MODE_DEV:-0}"
session_open=0
current_deep_link=""

[[ "$platform" == "android" || "$platform" == "ios" ]] || \
  fail "Platform must be 'android' or 'ios'."
[[ -n "$actual_dir" ]] || fail "An output directory is required."
[[ -f "$capture_manifest" ]] || fail "Capture manifest not found at $capture_manifest."

case "$dev_mode" in
  0 | 1) ;;
  *) fail "VRT_MODE_DEV must be '0' or '1'." ;;
esac

command -v agent-device >/dev/null 2>&1 || \
  fail "agent-device is required. Install version 0.21.0 or newer."

case "$platform" in
  android)
    target_args=(--device "$ANDROID_AVD_NAME")
    devices_output="$(agent-device devices --platform android --json)"
    resolved_device="$(
      jq -r --arg configured "$ANDROID_AVD_NAME" '
        [
          .data.devices[]
          | select(.booted)
          | select(
              .id == $configured
              or .name == $configured
              or (.name | gsub(" "; "_")) == $configured
            )
          | .id
        ][0] // empty
      ' <<< "$devices_output"
    )"
    if [[ -n "$resolved_device" ]]; then
      target_args=(--serial "$resolved_device")
    fi
    ;;
  ios) target_args=(--device "$IOS_SIMULATOR_NAME") ;;
esac

agent_device() {
  AGENT_DEVICE_SESSION="$session_name" \
    agent-device "$@" --platform "$platform" "${target_args[@]}"
}

run_quiet() {
  local output

  if output="$(agent_device "$@" 2>&1)"; then
    return
  fi

  if [[ "$session_open" -eq 1 && "$output" == *"SESSION_NOT_FOUND"* ]]; then
    reattach_app
    if output="$(agent_device "$@" 2>&1)"; then
      return
    fi
  fi

  printf '%s\n' "$output" >&2
  return 1
}

close_session() {
  if [[ "$session_open" -eq 1 ]]; then
    agent_device close >/dev/null 2>&1 || true
  fi
}

trap close_session EXIT

reattach_app() {
  local output

  printf 'Reattaching expired agent-device session.\n'
  if ! output="$(agent_device open "$app_id" "$current_deep_link" --foreground 2>&1)"; then
    printf '%s\n' "$output" >&2
    return 1
  fi

  session_open=1
}

run_dev_replay() {
  local replay_file="$PROJECT_ROOT/.agent-device/vrt-dev-$platform.ad"
  local screenshot="$actual_dir/$dev_capture_id.png"
  local dev_client_url="${VRT_DEV_CLIENT_URL}&testID=$dev_capture_id"
  local output

  [[ -f "$replay_file" ]] || fail "Replay not found at $replay_file."
  session_open=1

  if ! output="$(
    agent_device replay "$replay_file" \
      --env "VRT_DEV_CLIENT_URL=$dev_client_url" \
      --env "VRT_SCREENSHOT=$screenshot" 2>&1
  )"; then
    printf '%s\n' "$output" >&2
    return 1
  fi

  session_open=0
  [[ -f "$screenshot" ]] || fail "agent-device did not write $screenshot."
}

normalize_ios_crop() {
  local screenshot="$1"
  local attrs_output="$2"
  local screenshot_output="$3"
  local density actual_width actual_height expected_width expected_height

  density="$(jq -r '.data.pixelDensity' <<< "$screenshot_output")"
  actual_width="$(jq -r '.data.width' <<< "$screenshot_output")"
  actual_height="$(jq -r '.data.height' <<< "$screenshot_output")"
  expected_width="$(
    jq -r --argjson density "$density" \
      '.data.node.rect.width * $density | round' <<< "$attrs_output"
  )"
  expected_height="$(
    jq -r --argjson density "$density" \
      '.data.node.rect.height * $density | round' <<< "$attrs_output"
  )"

  ((actual_width >= expected_width && actual_height >= expected_height)) || \
    fail "The crop for $screenshot is smaller than its element frame."

  if ((actual_width != expected_width || actual_height != expected_height)); then
    sips \
      --cropToHeightWidth "$expected_height" "$expected_width" \
      --cropOffset 0 0 \
      "$screenshot" >/dev/null
  fi
}

capture_crop() {
  local capture_id="$1"
  local selector="id=\"$capture_id-text\""
  local screenshot="$actual_dir/$capture_id.png"
  local attrs_output output
  local attempt
  local -a screenshot_args

  screenshot_args=("$screenshot" --crop-on "$selector")
  if [[ "$platform" == "ios" ]]; then
    screenshot_args+=(--pixel-density 3)
  fi
  screenshot_args+=(--json)

  for attempt in {1..5}; do
    if ! attrs_output="$(agent_device get attrs "$selector" --json 2>&1)"; then
      printf '%s\n' "$attrs_output" >&2
      return 1
    fi

    if ! output="$(
      agent_device screenshot "${screenshot_args[@]}" 2>&1
    )"; then
      if [[ "$session_open" -eq 1 && "$output" == *"SESSION_NOT_FOUND"* ]]; then
        reattach_app
        continue
      fi
      if [[ "$output" == *"CROP_EMPTY_INTERSECTION"* ]]; then
        run_quiet scroll down 0.12 --duration-ms 500 --settle
        continue
      fi
      printf '%s\n' "$output" >&2
      return 1
    fi

    if [[ "$output" != *"CROP_PARTIAL_INTERSECTION"* ]]; then
      [[ -f "$screenshot" ]] || \
        fail "agent-device did not write $screenshot."
      if [[ "$platform" == "ios" ]]; then
        normalize_ios_crop "$screenshot" "$attrs_output" "$output"
      fi
      return
    fi

    run_quiet scroll down 0.12 --duration-ms 500 --settle
  done

  fail "The crop for $capture_id remained partly off screen."
}

capture_all() {
  local capture_platform capture_id

  while read -r capture_platform capture_id; do
    [[ "$capture_platform" == "#" || -z "$capture_platform" ]] && continue
    [[ "$capture_platform" == "all" || "$capture_platform" == "$platform" ]] || continue
    [[ "$dev_mode" -eq 0 || "$capture_id" == "$dev_capture_id" ]] || continue

    printf 'Capturing %s\n' "$capture_id"
    current_deep_link="$VRT_APP_SCHEME://vrt?testID=$capture_id"
    run_quiet open "$app_id" "$current_deep_link" --foreground
    session_open=1
    run_quiet wait "id=\"$capture_id-text\"" 15000
    run_quiet wait stable 200 5000
    capture_crop "$capture_id"
  done < "$capture_manifest"
}

mkdir -p "$actual_dir"

if [[ "$dev_mode" -eq 1 ]]; then
  run_dev_replay
  exit 0
fi

run_quiet settings clear-app-state "$app_id"
capture_all

agent_device close >/dev/null
session_open=0
