# NoteWise — Setup & Installation Guide

Welcome! This guide explains how to install the **NoteWise AI App Builder** on your Android phone — no computer skills required.

---

## Option A — Download from GitHub Releases (Easiest)

1. **Open the Releases page** on your phone's browser:
   `https://github.com/tatonka21/notewise-knowledge-base-app/releases`

2. **Tap the latest release** and scroll to the **Assets** section.

3. **Tap the `.apk` file** to download it.

4. **Allow installs from unknown sources** when prompted (see below).

5. **Tap "Install"** when the download finishes.

6. **Open NoteWise** from your app drawer.

---

## Enabling "Unknown Sources" (One-time Step)

Android blocks apps that don't come from the Play Store by default. Here's how to allow it:

### Android 8 and newer
1. Go to **Settings → Apps → Special app access → Install unknown apps**.
2. Select your browser (e.g. Chrome).
3. Toggle **"Allow from this source"** to ON.

### Older Android
1. Go to **Settings → Security**.
2. Enable **"Unknown sources"**.

---

## First Run — Configuring Your API Key

NoteWise uses Google's Gemini AI model. You need a free API key to use AI features.

### Get a free Gemini API key
1. Visit <https://aistudio.google.com/app/apikey>
2. Sign in with a Google account.
3. Click **"Create API key"**.
4. Copy the key (starts with `AIza…`).

### Enter the key in the app
1. Open NoteWise and tap **Settings** (gear icon at the bottom).
2. Scroll to the **API CONFIGURATION** section.
3. Tap the **Gemini API Key** field and paste your key.
4. Tap outside the field — the key is saved automatically.

---

## Connecting to Your Own Server (Optional)

If you are running the NoteWise backend yourself:

1. In **Settings → API CONFIGURATION**, tap **API Server URL**.
2. Enter the full URL of your server, e.g. `https://your-server.example.com`.
3. Tap outside the field to save.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "App not installed" error | Make sure "Install unknown apps" is enabled for your browser |
| APK download blocked | Tap **Keep** or **Download anyway** in the browser warning |
| AI features don't work | Check that your Gemini API key is entered correctly in Settings |
| App crashes on launch | Try uninstalling and reinstalling the APK |

---

## Updating the App

When a new version is released, repeat the steps in **Option A** above. Android will automatically replace the old version.

---

*For developers who want to build the APK themselves, see [BUILD.md](BUILD.md).*
