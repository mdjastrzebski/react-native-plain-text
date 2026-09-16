#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/configure-android-vrt-device.sh"
"$SCRIPT_DIR/verify-vrt-environment.sh" android
yarn vrt:android run
yarn vrt:android test
