import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { navToEditor } from "@/lib/nav";
import { useGitHubStore } from "@/store/github-store";
import { useNotesStore } from "@/store/notes-store";

function ConnectForm() {
  const colors = useColors();
  const { connect, loading, error } = useGitHubStore();
  const [token, setToken] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [showToken, setShowToken] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.connectContainer}>
      <View style={[styles.connectIcon, { backgroundColor: colors.primary + "22" }]}>
        <IconSymbol name="chevron.left.forwardslash.chevron.right" size={40} color={colors.primary} />
      </View>
      <Text style={[styles.connectTitle, { color: colors.foreground }]}>Connect to GitHub</Text>
      <Text style={[styles.connectDesc, { color: colors.muted }]}>
        Sync your notes as Markdown files to a GitHub repository. You need a Personal Access Token with repo permissions.
      </Text>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.muted }]}>Personal Access Token</Text>
        <View style={[styles.tokenInputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <TextInput
            style={[styles.tokenInput, { color: colors.foreground }]}
            value={token}
            onChangeText={setToken}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            placeholderTextColor={colors.muted}
            secureTextEntry={!showToken}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={() => setShowToken((v) => !v)} style={styles.eyeBtn}>
            <IconSymbol name={showToken ? "eye.slash" : "eye"} size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.hint, { color: colors.muted }]}>
          Generate at github.com → Settings → Developer settings → Personal access tokens
        </Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.muted }]}>Repository URL</Text>
        <TextInput
          style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
          value={repoUrl}
          onChangeText={setRepoUrl}
          placeholder="https://github.com/username/repo"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
      </View>

      {error && (
        <View style={[styles.errorBox, { backgroundColor: colors.error + "22", borderColor: colors.error + "44" }]}>
          <IconSymbol name="exclamationmark.circle.fill" size={16} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.connectBtn, { backgroundColor: token.trim() && repoUrl.trim() ? colors.primary : colors.border }]}
        onPress={() => connect(token.trim(), repoUrl.trim())}
        disabled={!token.trim() || !repoUrl.trim() || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
            <Text style={styles.connectBtnText}>Connect Repository</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function ConnectedView() {
  const colors = useColors();
  const { repoOwner, repoName, commits, loading, error, disconnect, pushNotes, pullNotes, fetchCommits } = useGitHubStore();
  const { items, createItem, updateItem } = useNotesStore();
  const [pushResult, setPushResult] = useState<string | null>(null);
  const [pullResult, setPullResult] = useState<string | null>(null);

  useEffect(() => {
    fetchCommits();
  }, []);

  const handlePush = async () => {
    const notes = items.filter((i) => i.type !== "folder");
    if (notes.length === 0) {
      Alert.alert("No notes to push", "Create some notes first.");
      return;
    }

    const files = notes.map((note) => {
      const folder = items.find((i) => i.id === note.parentId && i.type === "folder");
      const path = folder
        ? `${folder.title}/${note.title}${note.type === "code" ? `.${note.language ?? "txt"}` : ".md"}`
        : `${note.title}${note.type === "code" ? `.${note.language ?? "txt"}` : ".md"}`;
      return {
        path: path.replace(/[^a-zA-Z0-9._\-\/]/g, "_"),
        content: note.content,
      };
    });

    const success = await pushNotes(files);
    setPushResult(success ? `Pushed ${files.length} files successfully!` : "Push failed.");
    setTimeout(() => setPushResult(null), 4000);
  };

  const handlePull = async () => {
    const files = await pullNotes();
    if (files.length === 0) {
      setPullResult("No markdown files found in repository.");
      setTimeout(() => setPullResult(null), 3000);
      return;
    }

    let imported = 0;
    for (const file of files) {
      const fileName = file.path.split("/").pop()?.replace(/\.md$/, "") ?? file.path;
      const existing = items.find((i) => i.title === fileName);
      if (existing) {
        updateItem(existing.id, { content: file.content });
      } else {
        createItem({ title: fileName, type: "note", content: file.content });
        imported++;
      }
    }
    setPullResult(`Pulled ${files.length} files (${imported} new, ${files.length - imported} updated).`);
    setTimeout(() => setPullResult(null), 5000);
  };

  const handleDisconnect = () => {
    Alert.alert("Disconnect GitHub", "Are you sure you want to disconnect?", [
      { text: "Cancel", style: "cancel" },
      { text: "Disconnect", style: "destructive", onPress: disconnect },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.connectedContainer}>
      {/* Repo info */}
      <View style={[styles.repoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.repoCardHeader}>
          <View style={[styles.repoIcon, { backgroundColor: colors.success + "22" }]}>
            <IconSymbol name="checkmark.circle.fill" size={20} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.repoName, { color: colors.foreground }]}>
              {repoOwner}/{repoName}
            </Text>
            <Text style={[styles.repoStatus, { color: colors.success }]}>Connected</Text>
          </View>
          <TouchableOpacity onPress={handleDisconnect}>
            <IconSymbol name="xmark" size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sync actions */}
      <View style={styles.syncActions}>
        <TouchableOpacity
          style={[styles.syncBtn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
          onPress={handlePush}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <IconSymbol name="arrow.up.circle.fill" size={22} color="#fff" />
          )}
          <View>
            <Text style={styles.syncBtnTitle}>Push Notes</Text>
            <Text style={styles.syncBtnSub}>Upload to GitHub</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.syncBtn, { backgroundColor: (colors as Record<string, string>).accent ?? colors.primary, opacity: loading ? 0.6 : 1 }]}
          onPress={handlePull}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <IconSymbol name="arrow.down.circle.fill" size={22} color="#fff" />
          )}
          <View>
            <Text style={styles.syncBtnTitle}>Pull Notes</Text>
            <Text style={styles.syncBtnSub}>Import from GitHub</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Result messages */}
      {(pushResult || pullResult || error) && (
        <View style={[styles.resultBox, {
          backgroundColor: error ? colors.error + "22" : colors.success + "22",
          borderColor: error ? colors.error + "44" : colors.success + "44",
        }]}>
          <IconSymbol
            name={error ? "exclamationmark.circle.fill" : "checkmark.circle.fill"}
            size={16}
            color={error ? colors.error : colors.success}
          />
          <Text style={[styles.resultText, { color: error ? colors.error : colors.success }]}>
            {error ?? pushResult ?? pullResult}
          </Text>
        </View>
      )}

      {/* Commit history */}
      <View style={styles.commitsSection}>
        <View style={styles.commitsSectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Commits</Text>
          <TouchableOpacity onPress={fetchCommits}>
            <IconSymbol name="arrow.clockwise" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {commits.length === 0 ? (
          <Text style={[styles.noCommits, { color: colors.muted }]}>No commits yet</Text>
        ) : (
          commits.map((commit) => (
            <View key={commit.sha} style={[styles.commitItem, { borderBottomColor: colors.border }]}>
              <View style={[styles.commitSha, { backgroundColor: colors.primary + "22" }]}>
                <Text style={[styles.commitShaText, { color: colors.primary }]}>{commit.sha}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.commitMessage, { color: colors.foreground }]} numberOfLines={1}>
                  {commit.message}
                </Text>
                <Text style={[styles.commitMeta, { color: colors.muted }]}>
                  {commit.author} · {new Date(commit.date).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

export default function GitHubScreen() {
  const colors = useColors();
  const { connected, load } = useGitHubStore();

  useEffect(() => {
    load();
  }, []);

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>GitHub</Text>
        <View style={[styles.statusDot, { backgroundColor: connected ? colors.success : colors.muted }]} />
        <Text style={[styles.statusText, { color: connected ? colors.success : colors.muted }]}>
          {connected ? "Connected" : "Not connected"}
        </Text>
      </View>

      {connected ? <ConnectedView /> : <ConnectForm />}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  // Connect form
  connectContainer: {
    padding: 24,
    alignItems: "center",
  },
  connectIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  connectTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  connectDesc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 28,
  },
  formGroup: {
    width: "100%",
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  tokenInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  tokenInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "monospace",
  },
  eyeBtn: {
    padding: 10,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  hint: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    width: "100%",
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  connectBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  // Connected view
  connectedContainer: {
    padding: 16,
    gap: 16,
  },
  repoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  repoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  repoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  repoName: {
    fontSize: 15,
    fontWeight: "700",
  },
  repoStatus: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  syncActions: {
    flexDirection: "row",
    gap: 12,
  },
  syncBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
  },
  syncBtnTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  syncBtnSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    marginTop: 1,
  },
  resultBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  resultText: {
    fontSize: 13,
    flex: 1,
  },
  commitsSection: {
    gap: 8,
  },
  commitsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  noCommits: {
    fontSize: 14,
    fontStyle: "italic",
  },
  commitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  commitSha: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  commitShaText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  commitMessage: {
    fontSize: 13,
    fontWeight: "500",
  },
  commitMeta: {
    fontSize: 11,
    marginTop: 2,
  },
});
