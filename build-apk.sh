#!/usr/bin/env bash
# build-apk.sh — One-command NoteWise Android APK builder (Mac / Linux)
#
# Builds a debug APK locally using expo prebuild + Gradle.
# No Expo account, no EXPO_TOKEN, no EAS CLI required.
#
# Prerequisites:
#   - Node.js 20+  (https://nodejs.org)
#   - pnpm 9+      (npm i -g pnpm)
#   - Java 17+     (https://adoptium.net) and JAVA_HOME set
#   - Android SDK  and ANDROID_HOME set  (https://developer.android.com/studio)
set -e

echo "=================================================="
echo "  NoteWise APK Builder (local Gradle build)"
echo "=================================================="

# ── 1. Check prerequisites ──────────────────────────────────────────────────
check_cmd() {
  if ! command -v "$1" &> /dev/null; then
    echo "ERROR: '$1' not found. $2"
    exit 1
  fi
}

check_cmd node  "Install Node.js 20+ from https://nodejs.org"
check_cmd pnpm  "Run: npm install -g pnpm"
check_cmd java  "Install JDK 17+ from https://adoptium.net and set JAVA_HOME"

if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
  echo "ERROR: ANDROID_HOME (or ANDROID_SDK_ROOT) is not set."
  echo "Install Android Studio from https://developer.android.com/studio"
  echo "then set ANDROID_HOME to the SDK path (e.g. ~/Library/Android/sdk)."
  exit 1
fi

# ── 2. Install project dependencies ────────────────────────────────────────
echo ""
echo "Installing project dependencies..."
pnpm install --frozen-lockfile

# ── 3. Install Expo CLI ─────────────────────────────────────────────────────
if ! command -v expo &> /dev/null; then
  echo ""
  echo "Installing @expo/cli..."
  npm install -g @expo/cli
fi

# ── 4. Generate native Android project ─────────────────────────────────────
echo ""
echo "Generating native Android project (expo prebuild)..."
npx expo prebuild --platform android --no-install

# ── 5. Tune Gradle ──────────────────────────────────────────────────────────
if ! grep -q "org.gradle.jvmargs" android/gradle.properties 2>/dev/null; then
  echo "org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=512m" >> android/gradle.properties
fi

# ── 6. Build debug APK ──────────────────────────────────────────────────────
echo ""
echo "Building debug APK (this takes ~10–20 minutes on first run)..."
cd android && ./gradlew assembleDebug --no-daemon
cd ..

# ── 7. Copy to project root ─────────────────────────────────────────────────
cp android/app/build/outputs/apk/debug/app-debug.apk notewise.apk

echo ""
echo "=================================================="
echo "  BUILD COMPLETE!"
echo ""
echo "  APK: $(pwd)/notewise.apk"
echo ""
echo "  To install on your Android phone:"
echo "    1. Enable 'Install Unknown Apps' in Android Settings"
echo "    2. Copy notewise.apk to your phone (USB, Google Drive, etc.)"
echo "    3. Tap the file on your phone and choose Install"
echo "=================================================="

