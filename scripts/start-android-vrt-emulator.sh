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

property() {
  local file="$1"
  local name="$2"
  awk -v prefix="$name=" \
    'index($0, prefix) == 1 { value = substr($0, length(prefix) + 1) } END { print value }' \
    "$file"
}

set_property() {
  local file="$1"
  local name="$2"
  local value="$3"
  local temporary_file
  temporary_file="$(mktemp "${file}.tmp.XXXXXX")"
  awk -v prefix="$name=" 'index($0, prefix) != 1 { print }' "$file" > "$temporary_file"
  printf '%s=%s\n' "$name" "$value" >> "$temporary_file"
  mv "$temporary_file" "$file"
}

android_sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
[[ -n "$android_sdk_root" ]] || fail \
  "ANDROID_HOME or ANDROID_SDK_ROOT must identify the Android SDK."

adb="$android_sdk_root/platform-tools/adb"
avdmanager="$android_sdk_root/cmdline-tools/latest/bin/avdmanager"
emulator="$android_sdk_root/emulator/emulator"
emulator_properties="$android_sdk_root/emulator/source.properties"
system_image="system-images;android-$ANDROID_API_LEVEL;$ANDROID_SYSTEM_IMAGE_TARGET;$ANDROID_SYSTEM_IMAGE_ARCHITECTURE"
system_image_properties="$android_sdk_root/system-images/android-$ANDROID_API_LEVEL/$ANDROID_SYSTEM_IMAGE_TARGET/$ANDROID_SYSTEM_IMAGE_ARCHITECTURE/source.properties"

case "$ANDROID_HEADLESS" in
  0) ;;
  1) emulator_window_arg="-no-window" ;;
  *) fail "ANDROID_HEADLESS must be '0' or '1'." ;;
esac

[[ -x "$adb" ]] || fail "adb not found at $adb."
[[ -x "$avdmanager" ]] || fail "avdmanager not found at $avdmanager."
[[ -x "$emulator" ]] || fail "Android emulator not found at $emulator."
[[ -f "$emulator_properties" ]] || fail "Emulator metadata not found at $emulator_properties."
[[ -f "$system_image_properties" ]] || fail \
  "Install '$system_image' before running Android VRT."
[[ "$(property "$emulator_properties" Pkg.Revision)" == "$ANDROID_EMULATOR_VERSION" ]] || fail \
  "Android emulator $ANDROID_EMULATOR_VERSION is required."
[[ "$(property "$emulator_properties" Pkg.BuildId)" == "$ANDROID_EMULATOR_BUILD" ]] || fail \
  "Android emulator build $ANDROID_EMULATOR_BUILD is required."
[[ "$(property "$system_image_properties" Pkg.Revision)" == "$ANDROID_SYSTEM_IMAGE_REVISION" ]] || fail \
  "Android system image revision $ANDROID_SYSTEM_IMAGE_REVISION is required."

device_catalog="$($avdmanager list device)"
grep -Eq "id: [0-9]+ or \"$ANDROID_DEVICE_TYPE\"" <<< "$device_catalog" || fail \
  "avdmanager does not provide the '$ANDROID_DEVICE_TYPE' device profile."

avd_root="${ANDROID_AVD_HOME:-${ANDROID_USER_HOME:-${HOME}/.android}/avd}"
avd_config="$avd_root/$ANDROID_AVD_NAME.avd/config.ini"
expected_image_path="system-images/android-$ANDROID_API_LEVEL/$ANDROID_SYSTEM_IMAGE_TARGET/$ANDROID_SYSTEM_IMAGE_ARCHITECTURE/"

# An AVD left over from an older VRT configuration is recreated, but only when a
# person at a terminal agrees: it may hold state someone wants to keep. CI and
# other non-interactive runs still fail with the reason.
recreate_avd() {
  local reason="$1"
  local answer=""
  if [[ -n "${CI:-}" ]] || ! { : < /dev/tty; } 2>/dev/null; then
    fail "$reason Delete it and run setup again."
  fi
  printf '%s\nDelete and recreate AVD %s? [y/N] ' "$reason" "$ANDROID_AVD_NAME" >&2
  read -r answer < /dev/tty || true
  [[ "$answer" == [yY] || "$answer" == [yY][eE][sS] ]] || fail "$reason Delete it and run setup again."

  local candidate candidate_name
  while read -r candidate; do
    candidate_name="$("$adb" -s "$candidate" emu avd name 2>/dev/null | sed -n '1p' | tr -d '\r')"
    if [[ "$candidate_name" == "$ANDROID_AVD_NAME" ]]; then
      printf 'Stopping %s.\n' "$candidate" >&2
      "$adb" -s "$candidate" emu kill >/dev/null 2>&1 || true
      local stop_deadline=$((SECONDS + 60))
      while "$adb" -s "$candidate" get-state >/dev/null 2>&1; do
        ((SECONDS < stop_deadline)) || fail "Emulator $candidate did not stop."
        sleep 1
      done
    fi
  done < <("$adb" devices | awk '$1 ~ /^emulator-/ { print $1 }')

  printf 'Deleting AVD %s.\n' "$ANDROID_AVD_NAME" >&2
  "$avdmanager" delete avd --name "$ANDROID_AVD_NAME" >&2
}

if [[ -f "$avd_config" ]]; then
  if [[ "$(property "$avd_config" image.sysdir.1)" != "$expected_image_path" ]]; then
    recreate_avd "AVD '$ANDROID_AVD_NAME' does not use '$system_image'."
  elif [[ "$(property "$avd_config" hw.device.name)" != "$ANDROID_DEVICE_TYPE" ]]; then
    recreate_avd "AVD '$ANDROID_AVD_NAME' does not use the '$ANDROID_DEVICE_TYPE' profile."
  fi
fi

if [[ ! -f "$avd_config" ]]; then
  printf 'Creating Android VRT AVD %s.\n' "$ANDROID_AVD_NAME" >&2
  printf 'no\n' | "$avdmanager" create avd \
    --force \
    --name "$ANDROID_AVD_NAME" \
    --package "$system_image" \
    --device "$ANDROID_DEVICE_TYPE" >&2
fi
[[ -f "$avd_config" ]] || fail "AVD creation did not produce $avd_config."

[[ "$(property "$avd_config" image.sysdir.1)" == "$expected_image_path" ]] || fail \
  "AVD '$ANDROID_AVD_NAME' does not use '$system_image'. Delete it and run setup again."
[[ "$(property "$avd_config" hw.device.name)" == "$ANDROID_DEVICE_TYPE" ]] || fail \
  "AVD '$ANDROID_AVD_NAME' does not use the '$ANDROID_DEVICE_TYPE' profile. Delete it and run setup again."

# Match the overrides written by ReactiveCircus/android-emulator-runner.
set_property "$avd_config" hw.cpu.ncore "$ANDROID_CORES"
set_property "$avd_config" hw.ramSize "$ANDROID_RAM_SIZE"
set_property "$avd_config" hw.heapSize "$ANDROID_HEAP_SIZE"
set_property "$avd_config" hw.keyboard "$ANDROID_HARDWARE_KEYBOARD"
set_property "$avd_config" disk.dataPartition.size "$ANDROID_DISK_SIZE"

serial="emulator-$ANDROID_EMULATOR_PORT"
if "$adb" -s "$serial" get-state >/dev/null 2>&1; then
  running_name="$($adb -s "$serial" emu avd name 2>/dev/null | sed -n '1p' | tr -d '\r')"
  [[ "$running_name" == "$ANDROID_AVD_NAME" ]] || fail \
    "Port $ANDROID_EMULATOR_PORT is already used by AVD '$running_name'."
  printf '%s\n' "$serial"
  exit 0
fi

log_dir="$PROJECT_ROOT/build/vrt/emulator"
mkdir -p "$log_dir"
log_file="$log_dir/android.log"
printf 'Starting Android VRT AVD %s as %s.\n' "$ANDROID_AVD_NAME" "$serial" >&2
emulator_args=(
  -avd "$ANDROID_AVD_NAME"
  -port "$ANDROID_EMULATOR_PORT"
  -gpu "$ANDROID_GPU_MODE"
  -no-snapshot
  -noaudio
  -no-boot-anim
  -no-metrics
  -skin "$ANDROID_RESOLUTION"
  -prop "qemu.vrt.density=$ANDROID_DENSITY"
  -prop "qemu.vrt.font_scale=$ANDROID_FONT_SCALE"
  -wipe-data
)
if [[ -n "${emulator_window_arg:-}" ]]; then
  emulator_args+=("$emulator_window_arg")
fi
nohup "$emulator" "${emulator_args[@]}" > "$log_file" 2>&1 &
emulator_pid=$!
printf '%s\n' "$emulator_pid" > "$log_dir/android.pid"
launch_complete=0
cleanup_failed_launch() {
  if [[ "$launch_complete" == "0" ]]; then
    kill "$emulator_pid" >/dev/null 2>&1 || true
  fi
}
trap cleanup_failed_launch EXIT

printf 'Waiting for boot (up to %ss). Log: %s\n' "$ANDROID_BOOT_TIMEOUT_SECONDS" "$log_file" >&2
deadline=$((SECONDS + ANDROID_BOOT_TIMEOUT_SECONDS))
while ((SECONDS < deadline)); do
  if "$adb" -s "$serial" get-state >/dev/null 2>&1 && \
    [[ "$("$adb" -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; then
    launch_complete=1
    printf '%s\n' "$serial"
    exit 0
  fi
  if ! kill -0 "$emulator_pid" 2>/dev/null; then
    tail -40 "$log_file" >&2 || true
    fail "Android emulator exited before completing boot. Log: $log_file"
  fi
  sleep 2
done

tail -40 "$log_file" >&2 || true
fail "Android emulator did not boot within $ANDROID_BOOT_TIMEOUT_SECONDS seconds. Log: $log_file"
