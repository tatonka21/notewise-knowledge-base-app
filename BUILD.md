# NoteWise — How to Get the Android APK

This guide explains every way to build and download the NoteWise `.apk` file.

---

## Option 1 — GitHub Actions (recommended, zero setup)

No Android SDK, no Expo account, no secrets needed.  
GitHub runs the full build for you on every push to `main` and on every merged pull request.

### Automatic builds
Whenever code lands on the `main` branch an APK is built and stored as a
**GitHub Actions artifact** for 90 days.

### Manual build (build right now, on any branch)

1. Go to **Actions** in the repository:  
   `https://github.com/tatonka21/notewise-knowledge-base-app/actions`
2. Click **"Build Android APK"** in the left sidebar.
3. Click **"Run workflow"**, pick a branch, then click the green **"Run workflow"** button.
4. Wait ~15–25 minutes for the job to finish (green ✅).
5. Click the completed workflow run, scroll to **"Artifacts"**, and download **`notewise-android-<sha>`**.
6. Unzip the downloaded file — you get `notewise.apk`.

---

## How to install the APK on your Android phone

1. **Enable installing unknown apps** on your phone  
   Settings → Apps → Special app access → Install unknown apps  
   → choose your browser or file manager → turn on "Allow from this source"
2. Transfer `notewise.apk` to your phone (email, Google Drive, USB cable, AirDrop, etc.)
3. Open your file manager, navigate to the APK, and tap it.
4. Tap **Install**.
5. Open **NoteWise** from your app drawer.
6. Enter your **Gemini API key** in Settings (the AI chat requires it).

---

## Option 2 — Build locally (Mac / Linux)

Requires Android SDK and Java 17 installed on your machine.

```bash
# Install dependencies
npm install -g @expo/cli
pnpm install

# Generate the native Android project
npx expo prebuild --platform android --no-install

# (Optional) tune Gradle memory if the build is slow
echo "org.gradle.jvmargs=-Xmx4g" >> android/gradle.properties

# Build the APK
cd android && ./gradlew assembleDebug --no-daemon

# The APK is at:
#   android/app/build/outputs/apk/debug/app-debug.apk
```

### Quick script

```bash
chmod +x build-apk.sh
./build-apk.sh
```

---

## Option 3 — EAS Cloud (needs Expo account)

If you have an Expo account and have set the `EXPO_TOKEN` GitHub secret, you can
trigger EAS cloud builds manually:

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

---

## App Configuration

| Setting | Value |
|---------|-------|
| Package name | `space.manus.knowledge.base.app.t20260228034613` |
| Min Android | SDK 24 (Android 7.0+) |
| Target Android | SDK 35 (Android 15) |
| Architecture | armeabi-v7a, arm64-v8a |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Workflow fails at "Generate native Android project" | Open an issue — check the build log for the exact error |
| Workflow fails at "Build debug APK" | Usually a Gradle memory issue; the workflow already sets `Xmx4g` |
| APK installs but app crashes | Enter your Gemini API key in **Settings → API Configuration** |
| "App not installed" error | Uninstall any previous version first, then re-install |
| GitHub says "No artifacts" | The workflow is still running, or it failed — check the Actions log |

---

*For first-time setup and feature overview, see [SETUP.md](SETUP.md).*

