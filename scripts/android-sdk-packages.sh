#!/usr/bin/env bash

# Print an installed Android SDK package's canonical revision without relying
# on the output format of sdkmanager or its Android CLI replacement.
installed_android_sdk_package_version() {
  local sdk_root="$1"
  local package
  package="$(tr ';' '/' <<< "$2")"
  local properties_file="$sdk_root/$package/source.properties"

  [[ -f "$properties_file" ]] || return 0

  awk -F '=' '$1 == "Pkg.Revision" { print $2; exit }' "$properties_file"
}
