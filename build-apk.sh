#!/usr/bin/env bash
# build-apk.sh — One-command NoteWise Android APK builder (Mac / Linux)
# Usage: ./build-apk.sh [preview|production]  (default: preview)
set -e

PROFILE="${1:-preview}"

echo "=================================================="
echo "  NoteWise APK Builder"
echo "  Profile: $PROFILE"
echo "=================================================="

# ── 1. Check prerequisites ──────────────────────────────────────────────────
check_cmd() {
  if ! command -v "$1" &> /dev/null; then
    echo "ERROR: '$1' is not installed."
    echo "$2"
    exit 1
  fi
}

check_cmd node  "Install Node.js 20+ from https://nodejs.org"
check_cmd pnpm  "Run: npm install -g pnpm"

# ── 2. Install / update EAS CLI ────────────────────────────────────────────
if ! command -v eas &> /dev/null; then
  echo "Installing EAS CLI..."
  npm install -g eas-cli
else
  echo "EAS CLI already installed: $(eas --version 2>/dev/null || true)"
fi

# ── 3. Install project dependencies ────────────────────────────────────────
echo ""
echo "Installing dependencies..."
pnpm install --frozen-lockfile

# ── 4. Ensure user is logged in to Expo ────────────────────────────────────
echo ""
echo "Checking Expo login..."
if ! eas whoami &> /dev/null; then
  echo "Please log in to your Expo account:"
  eas login
fi

echo "Logged in as: $(eas whoami)"

# ── 5. Build ────────────────────────────────────────────────────────────────
echo ""
echo "Starting EAS build (platform: android, profile: $PROFILE)..."
echo "This typically takes 5-15 minutes. A download link will appear when done."
echo ""
eas build --platform android --profile "$PROFILE" --non-interactive

echo ""
echo "=================================================="
echo "  Build complete!"
echo "  Download your APK from the link above."
echo "  See SETUP.md for installation instructions."
echo "=================================================="
