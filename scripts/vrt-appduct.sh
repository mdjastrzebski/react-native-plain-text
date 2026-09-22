#!/usr/bin/env bash

# Sourced by capture-vrt.sh and run-vrt-e2e.sh. Provides Appduct session helpers that
# replace the old per-capture deep link: the caller must have sourced vrt-config.sh (for
# VRT_APP_SCHEME / VRT_APP_ID) and defined an `agent_device` function before calling
# appduct_connect. Everything runs from PROJECT_ROOT.
#
# The daemon is shared with every app that ever claimed a link: both example apps
# persist their link and auto-claim it again whenever the session drops, so an iOS
# session can be live during an Android run. Nothing here may select "the only active
# session": appduct_connect records the id of this platform's session and every invoke
# is pinned to that id.

appduct_bin="$PROJECT_ROOT/node_modules/.bin/appduct"
# The Appduct daemon's pinned-wss port; the emulator reaches it over an adb reverse.
VRT_APPDUCT_PORT="${VRT_APPDUCT_PORT:-8443}"
# Session recorded by the last appduct_connect; empty until one connects.
appduct_session_id=""

# The daemon auto-spawn opens a lock inside its state dir; on a fresh machine that
# directory does not exist yet and the spawn fails. Create it first (appduct expects
# mode 0700).
appduct_ensure_state_dir() {
  mkdir -p -m 700 "${APPDUCT_STATE_DIR:-$HOME/.appduct}"
}

fail_appduct() {
  printf 'Error: %s\n' "$*" >&2
  return 1
}

appduct_device_id() {
  local platform="$1"
  local file
  case "$platform" in
    android) file="$PROJECT_ROOT/build/vrt/devices/android-serial" ;;
    ios) file="$PROJECT_ROOT/build/vrt/devices/ios-udid" ;;
    *) return 1 ;;
  esac
  [[ -f "$file" ]] || return 1
  printf '%s' "$(<"$file")"
}

appduct_session_state() {
  local id="$1"
  [[ -n "$id" ]] || return 0
  "$appduct_bin" ls --json 2>/dev/null |
    jq -r --arg id "$id" 'first(.data[] | select(.sessionId == $id) | .state) // "absent"' \
    2>/dev/null || true
}

# Id of a live session whose device belongs to `platform`. The app may re-claim a link
# it persisted instead of the one just minted; its session still drives the right app.
appduct_matching_session() {
  local platform="$1" prefix
  case "$platform" in
    android) prefix="Android" ;;
    ios) prefix="iOS" ;;
    *) return 1 ;;
  esac
  "$appduct_bin" ls --json 2>/dev/null |
    jq -r --arg prefix "$prefix" \
      'first(.data[] | select(.state == "active" and
        ((.device.os // "") | startswith($prefix))) | .sessionId) // empty' \
    2>/dev/null || true
}

appduct_revoke() {
  local id="$1"
  [[ -n "$id" ]] || return 0
  "$appduct_bin" revoke "$id" >/dev/null 2>&1 || true
}

appduct_is_active() {
  [[ -n "$appduct_session_id" ]] || return 1
  [[ "$(appduct_session_state "$appduct_session_id")" == "active" ]]
}

# Record this platform's live session, preferring the freshly minted id. Succeeds only
# once such a session is active; sessions of other platforms are ignored.
appduct_wait_active() {
  local platform="$1" minted="$2" timeout="$3" waited=0 id
  while ((waited < timeout)); do
    if [[ -n "$minted" ]] &&
      [[ "$(appduct_session_state "$minted")" == "active" ]]; then
      appduct_session_id="$minted"
      return 0
    fi
    id="$(appduct_matching_session "$platform")"
    if [[ -n "$id" ]]; then
      appduct_session_id="$id"
      return 0
    fi
    sleep 2
    waited=$((waited + 2))
  done
  return 1
}

appduct_invoke() {
  # appduct_invoke <tool> <json-input> [extra appduct args...]
  [[ -n "$appduct_session_id" ]] ||
    {
      fail_appduct "No Appduct session yet; call appduct_connect first." || return 1
    }
  "$appduct_bin" invoke "$appduct_session_id" "$1" --input "$2" "${@:3}"
}

appduct_link_open() {
  local platform="$1" device_id="$2"
  local args=(link --json --scheme "$VRT_APP_SCHEME" --device "$device_id")
  case "$platform" in
    ios) args+=(--open ios-sim) ;;
    android) args+=(--open android --app-id "$VRT_APP_ID") ;;
  esac
  "$appduct_bin" "${args[@]}"
}

# Bring the app up as the automation target, then open a one-time Appduct bootstrap
# link and record the session this platform's app claims. Retries cover the one-time
# iOS "Open in app?" dialog and slow cold starts. The session then survives for every
# specimen switch.
appduct_connect() {
  local platform="$1" device_id timeout="${2:-60}" attempt minted
  device_id="$(appduct_device_id "$platform")" ||
    fail_appduct "Run 'yarn vrt $platform setup' first." || return 1
  appduct_ensure_state_dir

  if [[ "$platform" == "android" ]]; then
    local android_sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
    if [[ -n "$android_sdk_root" && -x "$android_sdk_root/platform-tools/adb" ]]; then
      "$android_sdk_root/platform-tools/adb" -s "$device_id" \
        reverse "tcp:$VRT_APPDUCT_PORT" "tcp:$VRT_APPDUCT_PORT" >/dev/null 2>&1 || true
    fi
  fi

  # A fresh process each time: at stage start this is a clean launch, and when called as
  # a rescue mid-capture it clears an app whose JS thread has wedged under load.
  agent_device open "$VRT_APP_ID" --relaunch >/dev/null

  for attempt in 1 2 3; do
    appduct_revoke "$appduct_session_id"
    minted="$(appduct_link_open "$platform" "$device_id" 2>/dev/null |
      jq -r '.data.sessionId // empty' 2>/dev/null || true)"
    if [[ "$platform" == "ios" ]]; then
      # The first custom-scheme open on a fresh simulator asks "Open in app?"; until
      # it is accepted the app never receives the bootstrap link.
      if agent_device alert wait 5000 >/dev/null 2>&1; then
        agent_device alert accept >/dev/null 2>&1 || true
      fi
    fi
    if appduct_wait_active "$platform" "$minted" "$timeout"; then
      printf 'Appduct session active on %s (attempt %s, session %s).\n' \
        "$platform" "$attempt" "$appduct_session_id"
      return 0
    fi
    printf 'Appduct connect attempt %s did not reach an active session on %s.\n' \
      "$attempt" "$platform" >&2
  done
  fail_appduct "Appduct never reached an active session on $platform."
}

appduct_disconnect() {
  appduct_revoke "$appduct_session_id"
}
