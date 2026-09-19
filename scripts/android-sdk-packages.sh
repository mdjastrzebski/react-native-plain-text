#!/usr/bin/env bash

# Print a property from an installed Android SDK package without relying on the
# output format of sdkmanager or its Android CLI replacement.
installed_android_sdk_package_property() {
  local sdk_root="$1"
  local package
  package="$(tr ';' '/' <<< "$2")"
  local property="$3"
  local properties_file="$sdk_root/$package/source.properties"

  [[ -f "$properties_file" ]] || return 0

  awk -F '=' -v property="$property" '$1 == property { print $2; exit }' \
    "$properties_file"
}

installed_android_sdk_package_version() {
  installed_android_sdk_package_property "$1" "$2" Pkg.Revision
}

installed_android_sdk_package_build() {
  installed_android_sdk_package_property "$1" "$2" Pkg.BuildId
}
