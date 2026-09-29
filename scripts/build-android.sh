#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

: "${JAVA_HOME:=/usr/lib/jvm/java-17-openjdk-amd64}"
: "${ANDROID_SDK_ROOT:=${ANDROID_HOME:-$HOME/Android/Sdk}}"
: "${OPENCV_VERSION:=4.10.0}"
: "${OPENCV_ANDROID_SDK:=$HOME/.cache/opencv-android/OpenCV-android-sdk}"
export JAVA_HOME ANDROID_SDK_ROOT ANDROID_HOME="$ANDROID_SDK_ROOT" OPENCV_ANDROID_SDK

if [[ ! -x "$ANDROID_SDK_ROOT/platform-tools/adb" ]]; then
  echo "Android SDK not found at $ANDROID_SDK_ROOT" >&2
  exit 1
fi

if [[ ! -f "$OPENCV_ANDROID_SDK/sdk/native/jni/include/opencv2/core.hpp" ]]; then
  CACHE_DIR="$(dirname "$OPENCV_ANDROID_SDK")"
  ZIP_PATH="$CACHE_DIR/opencv-${OPENCV_VERSION}-android-sdk.zip"
  mkdir -p "$CACHE_DIR"
  if [[ ! -s "$ZIP_PATH" ]]; then
    curl -L --fail --retry 3 -o "$ZIP_PATH" \
      "https://github.com/opencv/opencv/releases/download/${OPENCV_VERSION}/opencv-${OPENCV_VERSION}-android-sdk.zip"
  fi
  rm -rf "$OPENCV_ANDROID_SDK"
  unzip -q "$ZIP_PATH" -d "$CACHE_DIR"
  if [[ "$CACHE_DIR/OpenCV-android-sdk" != "$OPENCV_ANDROID_SDK" ]]; then
    rm -rf "$OPENCV_ANDROID_SDK"
    mv "$CACHE_DIR/OpenCV-android-sdk" "$OPENCV_ANDROID_SDK"
  fi
fi
test -f "$OPENCV_ANDROID_SDK/sdk/native/jni/include/opencv2/core.hpp"

npm ci
npm run lint
npm run build
rm -rf android/app/src/main/assets/web
mkdir -p android/app/src/main/assets/web
cp -R dist/. android/app/src/main/assets/web/

cd android
./gradlew clean assembleDebug assembleRelease

echo
 echo "APK files:"
find app/build/outputs/apk -type f -name '*.apk' -print
echo "Native libraries:"
unzip -l app/build/outputs/apk/debug/app-debug.apk | grep -E 'lib/(arm64-v8a|armeabi-v7a|x86_64)/libgeoimage2cad.so'
