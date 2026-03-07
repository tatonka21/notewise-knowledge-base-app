# NoteWise — Developer Build Guide

This guide covers how to build the NoteWise Android APK locally or via CI/CD.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | https://nodejs.org |
| pnpm | 9+ | `npm i -g pnpm` |
| Expo EAS CLI | latest | `npm i -g eas-cli` |
| Expo account | free | https://expo.dev |

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/tatonka21/notewise-knowledge-base-app.git
cd notewise-knowledge-base-app

# 2. Install dependencies
pnpm install

# 3. Log in to Expo
eas login

# 4. Build the APK (runs in Expo's cloud — no Android SDK needed)
eas build --platform android --profile preview
```

The build runs in Expo's cloud. When it finishes you'll get a download link for the `.apk` file.

---

## Local Quick Build Scripts

### Mac / Linux
```bash
chmod +x build-apk.sh
./build-apk.sh
```

### Windows
```bat
build-apk.bat
```

Both scripts handle installing dependencies, logging in to Expo, and launching the EAS build automatically.

---

## Build Profiles

The `eas.json` file defines three profiles:

| Profile | Type | Use case |
|---------|------|----------|
| `development` | debug APK | Local development with Expo Dev Client |
| `preview` | release APK | Testing / distributing to testers |
| `production` | release APK | Final production build |

Switch profiles with the `--profile` flag:
```bash
eas build --platform android --profile production
```

---

## GitHub Actions CI/CD

The workflow in `.github/workflows/build-android.yml` builds the APK automatically on:

- Every push to `main`
- Merging a pull request into `main`
- Publishing a GitHub Release (attaches APK to release assets)
- Manual trigger via **Actions → Build Android APK → Run workflow**

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `EXPO_TOKEN` | Your Expo access token — get it from https://expo.dev/accounts/[username]/settings/access-tokens |

Set secrets at:
`https://github.com/tatonka21/notewise-knowledge-base-app/settings/secrets/actions`

---

## App Configuration

### Package name
Defined in `app.config.ts`:
```ts
androidPackage: "space.manus.knowledge.base.app.t20260228034613"
```

### Android SDK targets
Configured in the `expo-build-properties` plugin in `app.config.ts`:
- `minSdkVersion`: 24 (Android 7.0+)
- `targetSdkVersion`: 35 (Android 15)

### Environment variables
Server-side environment variables are configured in `.env` (never commit this file).
See `.env.example` if present in the repository for the required keys.

---

## Troubleshooting

### EAS build fails with "Not logged in"
```bash
eas login
```

### `pnpm install` fails
Make sure you are using pnpm 9:
```bash
npm i -g pnpm@9
```

### Build takes a long time
EAS cloud builds typically take 5–15 minutes. Progress is shown in the terminal and at https://expo.dev/builds.

### APK installs but app crashes
1. Check that your Gemini API key is entered in **Settings → API CONFIGURATION**.
2. Check that the API Server URL points to a running NoteWise backend.

---

*For non-technical installation instructions, see [SETUP.md](SETUP.md).*
