import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useColors } from "@/hooks/use-colors";
import { useGitHubStore } from "@/store/github-store";
import { useNotesStore } from "@/store/notes-store";
import { useSettingsStore } from "@/store/settings-store";
import { useThemeContext } from "@/lib/theme-provider";

function SettingRow({
  icon,
  iconColor,
  title,
  subtitle,
  right,
}: {
  icon: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.settingIcon, { backgroundColor: iconColor + "22" }]}>
        <IconSymbol name={icon as "house.fill"} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingTitle, { color: colors.foreground }]}>{title}</Text>
        {subtitle && <Text style={[styles.settingSubtitle, { color: colors.muted }]}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const { setColorScheme } = useThemeContext();
  const { fontSize, editorTheme, geminiApiKey, apiBaseUrl, load, setFontSize, setEditorTheme, setGeminiApiKey, setApiBaseUrl } = useSettingsStore();
  const { items } = useNotesStore();
  const { connected, repoOwner, repoName } = useGitHubStore();

  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey);
  const [apiUrlInput, setApiUrlInput] = useState(apiBaseUrl);

  useEffect(() => {
    load();
  }, []);

  // Sync local inputs when store values load from AsyncStorage
  useEffect(() => {
    setApiKeyInput(geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    setApiUrlInput(apiBaseUrl);
  }, [apiBaseUrl]);

  const isDark = colorScheme === "dark";
  const noteCount = items.filter((i) => i.type !== "folder").length;
  const folderCount = items.filter((i) => i.type === "folder").length;
  const totalWords = items
    .filter((i) => i.type !== "folder")
    .reduce((acc, i) => acc + i.content.split(/\s+/).filter(Boolean).length, 0);

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Stats */}
        <View style={[styles.statsCard, { backgroundColor: colors.primary, borderRadius: 16 }]}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{noteCount}</Text>
            <Text style={styles.statLabel}>Notes</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.3)" }]} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{folderCount}</Text>
            <Text style={styles.statLabel}>Folders</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.3)" }]} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalWords.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Words</Text>
          </View>
        </View>

        {/* Appearance */}
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>APPEARANCE</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingRow
            icon="moon.fill"
            iconColor={colors.primary}
            title="Dark Mode"
            subtitle={isDark ? "Currently dark" : "Currently light"}
            right={
              <Switch
                value={isDark}
                onValueChange={(v) => setColorScheme(v ? "dark" : "light")}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        {/* Editor */}
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>EDITOR</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingRow
            icon="textformat.size"
            iconColor={colors.primary}
            title="Font Size"
            subtitle={`${fontSize}px`}
            right={
              <View style={styles.fontSizeControls}>
                <TouchableOpacity
                  style={[styles.fontSizeBtn, { backgroundColor: colors.border }]}
                  onPress={() => setFontSize(Math.max(10, fontSize - 1))}
                >
                  <Text style={[styles.fontSizeBtnText, { color: colors.foreground }]}>−</Text>
                </TouchableOpacity>
                <Text style={[styles.fontSizeValue, { color: colors.foreground }]}>{fontSize}</Text>
                <TouchableOpacity
                  style={[styles.fontSizeBtn, { backgroundColor: colors.border }]}
                  onPress={() => setFontSize(Math.min(24, fontSize + 1))}
                >
                  <Text style={[styles.fontSizeBtnText, { color: colors.foreground }]}>+</Text>
                </TouchableOpacity>
              </View>
            }
          />
          <SettingRow
            icon="moon.fill"
            iconColor={(colors as Record<string, string>).codebg ? "#6B7280" : colors.muted}
            title="Code Editor Theme"
            subtitle={editorTheme === "dark" ? "Dark (VS Dark)" : "Light (VS)"}
            right={
              <Switch
                value={editorTheme === "dark"}
                onValueChange={(v) => setEditorTheme(v ? "dark" : "light")}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        {/* GitHub */}
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>GITHUB</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingRow
            icon="chevron.left.forwardslash.chevron.right"
            iconColor={connected ? colors.success : colors.muted}
            title="Repository"
            subtitle={connected ? `${repoOwner}/${repoName}` : "Not connected"}
            right={
              <View style={[styles.statusBadge, { backgroundColor: connected ? colors.success + "22" : colors.border }]}>
                <Text style={[styles.statusBadgeText, { color: connected ? colors.success : colors.muted }]}>
                  {connected ? "Connected" : "Disconnected"}
                </Text>
              </View>
            }
          />
        </View>

        {/* API Configuration */}
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>API CONFIGURATION</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.settingIcon, { backgroundColor: colors.primary + "22" }]}>
              <IconSymbol name="key.fill" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>Gemini API Key</Text>
              <TextInput
                style={[styles.apiInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={apiKeyInput}
                onChangeText={setApiKeyInput}
                onBlur={() => {
                  const trimmed = apiKeyInput.trim();
                  setGeminiApiKey(trimmed);
                  if (trimmed) {
                    Alert.alert("Saved", "Gemini API key saved.");
                  }
                }}
                placeholder="AIza..."
                placeholderTextColor={colors.muted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.settingIcon, { backgroundColor: colors.primary + "22" }]}>
              <IconSymbol name="network" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>API Server URL</Text>
              <TextInput
                style={[styles.apiInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={apiUrlInput}
                onChangeText={setApiUrlInput}
                onBlur={() => {
                  const trimmed = apiUrlInput.trim();
                  setApiBaseUrl(trimmed);
                  if (trimmed) {
                    Alert.alert("Saved", "API server URL saved.");
                  }
                }}
                placeholder="https://your-server.example.com"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
          </View>
        </View>

        {/* About */}
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>ABOUT</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingRow
            icon="info.circle"
            iconColor={colors.primary}
            title="Notewise"
            subtitle="Version 1.0.0 · Personal Knowledge Base"
          />
          <SettingRow
            icon="brain"
            iconColor={(colors as Record<string, string>).accent ?? colors.primary}
            title="AI Assistant"
            subtitle="Powered by Gemini 2.5 Flash"
          />
          <SettingRow
            icon="terminal.fill"
            iconColor={colors.success}
            title="Code Editor"
            subtitle="Monaco Editor (VS Code engine)"
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  content: {
    padding: 16,
    gap: 8,
    paddingBottom: 100,
  },
  statsCard: {
    flexDirection: "row",
    padding: 20,
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
    fontWeight: "600",
  },
  statDivider: {
    width: 1,
    marginVertical: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 4,
    marginLeft: 4,
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "500",
  },
  settingSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  fontSizeControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fontSizeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  fontSizeBtnText: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 22,
  },
  fontSizeValue: {
    fontSize: 15,
    fontWeight: "600",
    minWidth: 24,
    textAlign: "center",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  apiInput: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
  },
});
