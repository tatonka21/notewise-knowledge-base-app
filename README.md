# NoteWise AI App Builder

A mobile knowledge-base app with wiki-style note linking, AI assistant,
Monaco code editor, folder/file organisation, and GitHub integration.

---

## 📲 Download the Android APK

### Easiest: Download from GitHub Releases

The latest pre-built APK is always available on the Releases page — no build step needed:

**➡ [Download APK from GitHub Releases](https://github.com/tatonka21/notewise-knowledge-base-app/releases/tag/latest)**

1. Click the link above.
2. Scroll to the **Assets** section and tap/click `notewise.apk`.
3. Enable **Settings → Apps → Special app access → Install unknown apps** for your browser.
4. Open the downloaded file and tap **Install**.
5. Launch **NoteWise**, go to **Settings**, and enter your free [Gemini API key](https://aistudio.google.com/app/apikey).

---

### Alternative: Trigger your own build

> **Quickest path: trigger a build in one click, download in ~20 minutes.**

#### 1. Start the build

Open **[Actions → Build Android APK](https://github.com/tatonka21/notewise-knowledge-base-app/actions/workflows/build-android.yml)** and click **Run workflow** → **Run workflow**.

*Or merge **[PR #3](https://github.com/tatonka21/notewise-knowledge-base-app/pull/3)** — builds run automatically on every merge to `main`.*

#### 2. Download the APK (~15–25 min later)

1. Go to the [Actions page](https://github.com/tatonka21/notewise-knowledge-base-app/actions).
2. Click the completed ✅ run.
3. Scroll to **Artifacts** and download **`notewise-android-<sha>`**.
4. Unzip → `notewise.apk`.

#### 3. Install on your Android phone

1. Enable **Settings → Apps → Special app access → Install unknown apps** for your browser.
2. Transfer `notewise.apk` to your phone (email, Google Drive, USB cable, etc.).
3. Tap the file → **Install**.
4. Open **NoteWise**, go to **Settings**, and enter your free [Gemini API key](https://aistudio.google.com/app/apikey).

For full non-technical instructions see **[SETUP.md](SETUP.md)**.  
For developer / local-build instructions see **[BUILD.md](BUILD.md)**.

---

## Features

- 📝 Wiki-style linked notes with `[[double-bracket]]` syntax
- 🤖 AI assistant powered by Google Gemini 2.5 Flash
- 💻 Monaco code editor (same editor as VS Code)
- 📁 Folder & file organisation
- 🔗 GitHub integration — read, write, and commit files from the app

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native + Expo |
| Navigation | Expo Router |
| Backend | tRPC + Express |
| Database | MySQL / TiDB (optional) |
| AI | Google Gemini 2.5 Flash |
| Styling | NativeWind (Tailwind) |
| Build | Gradle (local, no EAS needed) |

---

## Contributing

```bash
# Clone & install
git clone https://github.com/tatonka21/notewise-knowledge-base-app.git
cd notewise-knowledge-base-app
pnpm install

# Start dev server
pnpm start

# Run tests
pnpm test
```

See [BUILD.md](BUILD.md) for full build instructions.
