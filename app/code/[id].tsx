import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useNotesStore } from "@/store/notes-store";
import { useSettingsStore } from "@/store/settings-store";

const LANGUAGES = [
  "javascript", "typescript", "python", "json", "html", "css",
  "markdown", "bash", "sql", "rust", "go", "java", "cpp",
];

function getMonacoHtml(code: string, language: string, theme: string, fontSize: number): string {
  const escaped = code
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { overflow: hidden; background: ${theme === "dark" ? "#0D1117" : "#FFFFFF"}; }
  #container { width: 100vw; height: 100vh; }
</style>
</head>
<body>
<div id="container"></div>
<script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs/loader.js"></script>
<script>
require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' } });
require(['vs/editor/editor.main'], function() {
  var editor = monaco.editor.create(document.getElementById('container'), {
    value: \`${escaped}\`,
    language: '${language}',
    theme: '${theme === "dark" ? "vs-dark" : "vs"}',
    fontSize: ${fontSize},
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    automaticLayout: true,
    lineNumbers: 'on',
    folding: true,
    bracketPairColorization: { enabled: true },
    renderLineHighlight: 'all',
    padding: { top: 12, bottom: 12 },
    fontFamily: 'Menlo, Monaco, Consolas, monospace',
    fontLigatures: true,
  });
  
  editor.onDidChangeModelContent(function() {
    var content = editor.getValue();
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'change', content: content }));
  });
  
  window.addEventListener('message', function(e) {
    try {
      var msg = JSON.parse(e.data);
      if (msg.type === 'setLanguage') {
        monaco.editor.setModelLanguage(editor.getModel(), msg.language);
      }
      if (msg.type === 'setTheme') {
        monaco.editor.setTheme(msg.theme === 'dark' ? 'vs-dark' : 'vs');
      }
      if (msg.type === 'getContent') {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'content', content: editor.getValue() }));
      }
    } catch(err) {}
  });
});
</script>
</body>
</html>`;
}

export default function CodeEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { getItem, updateItem } = useNotesStore();
  const { fontSize, editorTheme } = useSettingsStore();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const item = getItem(id);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setContent(item.content);
      setLanguage(item.language ?? "javascript");
    } else if (id) {
      console.warn(`Code file with id ${id} not found`);
    }
  }, [id, item]);

  const scheduleSave = (newTitle: string, newContent: string, newLang: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateItem(id, { title: newTitle, content: newContent, language: newLang });
    }, 1000);
  };

  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "change") {
        setContent(msg.content);
        scheduleSave(title, msg.content, language);
      }
    } catch {}
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setShowLangPicker(false);
    webViewRef.current?.injectJavaScript(
      `window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'setLanguage', language: '${lang}' }) })); true;`
    );
    scheduleSave(title, content, lang);
  };

  if (!item) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12 }}>
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "600" }}>File not found</Text>
          <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center" }}>ID: {id}</Text>
          <TouchableOpacity
            style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 }}
            onPress={() => router.back()}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const monacoHtml = getMonacoHtml(content, language, editorTheme, fontSize);

  return (
    <ScreenContainer containerClassName="bg-background" edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: (colors as Record<string, string>).codebg ?? colors.surface }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={[styles.titleInput, { color: colors.foreground }]}
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            scheduleSave(t, content, language);
          }}
          placeholder="File name..."
          placeholderTextColor={colors.muted}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.langBtn, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}
          onPress={() => setShowLangPicker((v) => !v)}
        >
          <Text style={[styles.langBtnText, { color: colors.primary }]}>{language}</Text>
          <IconSymbol name="chevron.down" size={12} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Language picker */}
      {showLangPicker && (
        <View style={[styles.langPicker, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[styles.langOption, { borderBottomColor: colors.border, backgroundColor: lang === language ? colors.primary + "22" : "transparent" }]}
              onPress={() => handleLanguageChange(lang)}
            >
              <Text style={[styles.langOptionText, { color: lang === language ? colors.primary : colors.foreground }]}>
                {lang}
              </Text>
              {lang === language && <IconSymbol name="checkmark" size={14} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Monaco Editor */}
      {Platform.OS === "web" ? (
        // Fallback for web: plain textarea
        <TextInput
          style={[
            styles.webFallback,
            {
              color: "#E8E8F0",
              backgroundColor: "#0D1117",
              fontFamily: "Menlo, Monaco, Consolas, monospace",
              fontSize,
            },
          ]}
          value={content}
          onChangeText={(c) => {
            setContent(c);
            scheduleSave(title, c, language);
          }}
          multiline
          textAlignVertical="top"
          placeholder={`// ${language} code here...`}
          placeholderTextColor="#6B7280"
        />
      ) : (
        <WebView
          ref={webViewRef}
          source={{ html: monacoHtml }}
          style={styles.webView}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          mixedContentMode="always"
          allowFileAccess
          allowUniversalAccessFromFileURLs
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  backBtn: { padding: 4 },
  titleInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    padding: 0,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  langBtnText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  langPicker: {
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 4,
    overflow: "hidden",
    maxHeight: 250,
    zIndex: 10,
  },
  langOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  langOptionText: {
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  webView: {
    flex: 1,
    backgroundColor: "#0D1117",
  },
  webFallback: {
    flex: 1,
    padding: 16,
    fontSize: 14,
    lineHeight: 22,
  },
});
