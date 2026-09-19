#!/usr/bin/env bash

# Best-effort collection: diagnostics must never hide the original VRT result.
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENT_DEVICE_ROOT="${AGENT_DEVICE_STATE_DIR:-$HOME/.agent-device}"
DESTINATION="$PROJECT_ROOT/build/vrt/logs/agent-device"

mkdir -p "$DESTINATION"

copy_if_present() {
  local source="$1"
  local destination="$2"

  if [[ -d "$source" ]]; then
    mkdir -p "$destination"
    cp -a "$source/." "$destination/"
  elif [[ -f "$source" ]]; then
    cp -a "$source" "$destination"
  fi
}

copy_if_present "$AGENT_DEVICE_ROOT/daemon.log" "$DESTINATION/daemon.log"
copy_if_present \
  "$AGENT_DEVICE_ROOT/daemon-shutdown.json" \
  "$DESTINATION/daemon-shutdown.json"
copy_if_present \
  "$AGENT_DEVICE_ROOT/sessions/plaintext-vrt-ios" \
  "$DESTINATION/plaintext-vrt-ios-session"
copy_if_present \
  "$AGENT_DEVICE_ROOT/logs/plaintext-vrt-ios" \
  "$DESTINATION/plaintext-vrt-ios-requests"

printf 'Collected available iOS agent-device diagnostics in %s.\n' "$DESTINATION"
