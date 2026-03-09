@echo off
:: build-apk.bat — One-command NoteWise Android APK builder (Windows)
:: Usage: build-apk.bat [preview|production]  (default: preview)

setlocal enabledelayedexpansion

set "PROFILE=%~1"
if "%PROFILE%"=="" set "PROFILE=preview"

echo ==================================================
echo   NoteWise APK Builder
echo   Profile: %PROFILE%
echo ==================================================

:: ── 1. Check prerequisites ──────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed.
    echo Install it from https://nodejs.org
    exit /b 1
)

where pnpm >nul 2>&1
if errorlevel 1 (
    echo Installing pnpm...
    npm install -g pnpm
)

:: ── 2. Install / update EAS CLI ────────────────────────────────────────────
where eas >nul 2>&1
if errorlevel 1 (
    echo Installing EAS CLI...
    npm install -g eas-cli
) else (
    echo EAS CLI is already installed.
)

:: ── 3. Install project dependencies ────────────────────────────────────────
echo.
echo Installing dependencies...
pnpm install --frozen-lockfile
if errorlevel 1 (
    echo ERROR: pnpm install failed.
    exit /b 1
)

:: ── 4. Ensure user is logged in to Expo ────────────────────────────────────
echo.
echo Checking Expo login...
eas whoami >nul 2>&1
if errorlevel 1 (
    echo Please log in to your Expo account:
    eas login
)

:: ── 5. Build ────────────────────────────────────────────────────────────────
echo.
echo Starting EAS build (platform: android, profile: %PROFILE%)...
echo This typically takes 5-15 minutes. A download link will appear when done.
echo.
eas build --platform android --profile %PROFILE% --non-interactive
if errorlevel 1 (
    echo ERROR: EAS build failed.
    exit /b 1
)

echo.
echo ==================================================
echo   Build complete!
echo   Download your APK from the link above.
echo   See SETUP.md for installation instructions.
echo ==================================================

endlocal
