#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
test_build=$(mktemp -d /tmp/pome-homekit-tests.XXXXXX)
swiftc -emit-library -emit-module -module-name HomeKit tests/HomeKitDouble.swift -o "$test_build/libHomeKit.dylib" -emit-module-path "$test_build/HomeKit.swiftmodule"
swiftc -I "$test_build" -L "$test_build" -lHomeKit -Xlinker -rpath -Xlinker "$test_build" experiments/homekit-camera/HomeControl.swift tests/HomeControlTests.swift -o "$test_build/home-tests"
"$test_build/home-tests"
swiftc experiments/homekit-camera/CacheHTTP.swift tests/HomeHTTPTests.swift -o "$test_build/http-tests"
"$test_build/http-tests"
