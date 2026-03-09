import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { navToCode, navToEditor, navToPreview } from "@/lib/nav";
import { trpc } from "@/lib/trpc";
import {
  launchApp,
  makeCall,
  openMaps,
  openSettings,
  openUrl,
  sendEmail,
  sendSms,
  shareText,
  type DeviceActionResult,
} from "@/lib/device-actions";
import {
  commitFiles,
  createBranch,
  readFile,
} from "@/lib/github-actions";
import { NoteItem, useNotesStore } from "@/store/notes-store";
import { useGeneratedAppsStore } from "@/store/generated-apps-store";
import { useGitHubStore } from "@/store/github-store";

interface DeviceActionOutcome {
  title: string;
  success: boolean;
  message: string;
  detail?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AiAction[];
  deviceOutcomes?: DeviceActionOutcome[];
  createdItems?: NoteItem[];
  generatedAppId?: string;
  generatedAppName?: string;
  generatedAppType?: "app" | "website";
}

interface AiAction {
  action: string;
  title?: string;
  content?: string;
  parentId?: string | null;
  language?: string;
  id?: string;
  // device-action fields
  url?: string;
  phone?: string;
  body?: string;
  to?: string;
  subject?: string;
  text?: string;
  query?: string;
  path?: string;
  // github-action fields
  files?: Array<{ path: string; content: string }>;
  message?: string;
  branch?: string;
  fromBranch?: string;
}

const SUGGESTIONS = [
  "Create a folder called 'React' with notes for hooks, state, and props",
  "Write a TypeScript utility function for debouncing",
  "Open YouTube on my phone",
  "Open Google Maps and search for coffee shops near me",
  "Commit a new feature to my GitHub repo",
  "Read the file src/index.ts from my GitHub repo",
  "Create a branch called feat/my-feature in my GitHub repo",
  "Generate a weather website",
];

/**
 * Detect if the user wants to generate an app or website.
 * Returns null if it's a general chat message.
 * When both app and website keywords are present, website takes priority.
 */
function detectGenerationIntent(text: string): { type: "app" | "website"; name: string } | null {
  const lower = text.toLowerCase();
  const isGenerate = /\b(generate|create|build|make)\b/.test(lower);
  if (!isGenerate) return null;

  const isWebsite = /\b(website|web site|webpage|web page|html|landing page|site)\b/.test(lower);
  const isApp = /\b(app|application|android|mobile)\b/.test(lower);

  if (!isWebsite && !isApp) return null;

  // Website takes priority when both keywords are present (e.g., "web app")
  const type: "app" | "website" = isWebsite ? "website" : "app";

  // Extract a name: try to find "called X", "named X"
  const calledMatch = text.match(/(?:called|named)\s+["']?([^"'\n,]+?)["']?(?:\s|$)/i);
  if (calledMatch) {
    return { type, name: calledMatch[1].trim() };
  }

  // Fallback: use a cleaned-up version of the message as the name
  const name = text
    .replace(/\b(generate|create|build|make|a|an|the|android|mobile|app|application|website|web site|webpage|web page|html|landing page|site)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 4)
    .join(" ")
    || (isWebsite ? "My Website" : "My App");

  return { type, name };
}

export default function AIScreen() {
  const colors = useColors();
  const { items, createItem, updateItem } = useNotesStore();
  const { addApp } = useGeneratedAppsStore();
  const {
    token: ghToken,
    repoOwner: ghOwner,
    repoName: ghRepo,
    connected: ghConnected,
  } = useGitHubStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const chatMutation = trpc.ai.chat.useMutation();
  const generateAppMutation = trpc.ai.generateApp.useMutation();
  const generateWebsiteMutation = trpc.ai.generateWebsite.useMutation();

  const notesContext = items.map((i) => ({
    id: i.id,
    title: i.title,
    type: i.type,
    parentId: i.parentId,
  }));

  const githubContext = {
    connected: ghConnected,
    owner: ghOwner,
    repo: ghRepo,
  };

  const executeActions = async (
    actions: AiAction[],
  ): Promise<{ createdItems: NoteItem[]; deviceOutcomes: DeviceActionOutcome[] }> => {
    const created: NoteItem[] = [];
    const outcomes: DeviceActionOutcome[] = [];
    const idMap: Record<string, string> = {};

    for (const act of actions) {
      // ── Knowledge-base actions ────────────────────────────────────────
      if (act.action === "create_folder") {
        const parentId = act.parentId ? (idMap[act.parentId] ?? act.parentId) : null;
        const item = createItem({
          title: act.title ?? "New Folder",
          type: "folder",
          parentId,
        });
        if (act.title) idMap[act.title] = item.id;
        created.push(item);
      } else if (act.action === "create_note") {
        const parentId = act.parentId ? (idMap[act.parentId] ?? act.parentId) : null;
        const item = createItem({
          title: act.title ?? "Untitled Note",
          type: "note",
          content: act.content ?? `# ${act.title ?? "Untitled"}\n\n`,
          parentId,
        });
        if (act.title) idMap[act.title] = item.id;
        created.push(item);
      } else if (act.action === "create_code") {
        const parentId = act.parentId ? (idMap[act.parentId] ?? act.parentId) : null;
        const item = createItem({
          title: act.title ?? "Untitled Code",
          type: "code",
          content: act.content ?? "",
          language: act.language ?? "javascript",
          parentId,
        });
        if (act.title) idMap[act.title] = item.id;
        created.push(item);
      } else if (act.action === "update_note" && act.id) {
        updateItem(act.id, { content: act.content });

      // ── Device actions ────────────────────────────────────────────────
      } else if (act.action === "open_url" && act.url) {
        const result = await openUrl(act.url);
        outcomes.push({ title: act.title ?? act.url, ...result });
      } else if (act.action === "launch_app" && act.url) {
        const result = await launchApp(act.url);
        outcomes.push({ title: act.title ?? act.url, ...result });
      } else if (act.action === "make_call" && act.phone) {
        const result = await makeCall(act.phone);
        outcomes.push({ title: act.title ?? `Call ${act.phone}`, ...result });
      } else if (act.action === "send_sms" && act.phone) {
        const result = await sendSms(act.phone, act.body);
        outcomes.push({ title: act.title ?? `SMS ${act.phone}`, ...result });
      } else if (act.action === "send_email" && act.to) {
        const result = await sendEmail(act.to, act.subject, act.body);
        outcomes.push({ title: act.title ?? `Email ${act.to}`, ...result });
      } else if (act.action === "share_text" && act.text) {
        const result = await shareText(act.text, act.title);
        outcomes.push({ title: act.title ?? "Share", ...result });
      } else if (act.action === "open_maps" && act.query) {
        const result = await openMaps(act.query);
        outcomes.push({ title: act.title ?? act.query, ...result });
      } else if (act.action === "open_settings") {
        const result = await openSettings(act.path);
        outcomes.push({ title: act.title ?? "Settings", ...result });

      // ── GitHub actions ────────────────────────────────────────────────
      } else if (act.action === "github_commit_files" && act.files && act.files.length > 0) {
        if (!ghConnected || !ghToken || !ghOwner || !ghRepo) {
          outcomes.push({
            title: act.title ?? "GitHub commit",
            success: false,
            message: "No GitHub repository connected. Go to the GitHub tab to connect one.",
          });
        } else {
          const result = await commitFiles(
            ghToken,
            ghOwner,
            ghRepo,
            act.files,
            act.message ?? "AI-generated commit (Notewise AI, no message provided)",
            act.branch,
          );
          outcomes.push({ title: act.title ?? "GitHub commit", ...result });
        }
      } else if (act.action === "github_create_branch" && act.branch) {
        if (!ghConnected || !ghToken || !ghOwner || !ghRepo) {
          outcomes.push({
            title: act.title ?? "Create branch",
            success: false,
            message: "No GitHub repository connected. Go to the GitHub tab to connect one.",
          });
        } else {
          const result = await createBranch(
            ghToken,
            ghOwner,
            ghRepo,
            act.branch,
            act.fromBranch,
          );
          outcomes.push({ title: act.title ?? `Branch: ${act.branch}`, ...result });
        }
      } else if (act.action === "github_read_file" && act.path) {
        if (!ghConnected || !ghToken || !ghOwner || !ghRepo) {
          outcomes.push({
            title: act.title ?? "Read file",
            success: false,
            message: "No GitHub repository connected. Go to the GitHub tab to connect one.",
          });
        } else {
          const result = await readFile(
            ghToken,
            ghOwner,
            ghRepo,
            act.path,
            act.branch,
          );
          outcomes.push({ title: act.title ?? act.path, ...result });
          // If file was read successfully, inject its content into the next AI message
          // by appending to the outcomes detail so the user can see/copy it
        }
      }
    }
    return { createdItems: created, deviceOutcomes: outcomes };
  };

  const sendMessage = async (text?: string) => {
    const messageText = (text ?? input).trim();
    if (!messageText || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const intent = detectGenerationIntent(messageText);

      if (intent) {
        // Route to dedicated generation endpoints
        if (intent.type === "website") {
          const result = await generateWebsiteMutation.mutateAsync({
            description: messageText,
            siteName: intent.name,
          });

          if (result.success && result.website) {
            const newApp = addApp({
              type: "website",
              name: result.website.siteName ?? intent.name,
              description: result.website.description ?? messageText,
              code: result.website.html ?? JSON.stringify(result.website, null, 2),
              preview: result.website.html,
            });
            const assistantMsg: Message = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: `I've generated the **${newApp.name}** website! Tap the preview below to view it.`,
              generatedAppId: newApp.id,
              generatedAppName: newApp.name,
              generatedAppType: "website",
            };
            setMessages((prev) => [...prev, assistantMsg]);
          } else {
            const errMsg: Message = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: `Sorry, I couldn't generate the website. ${(result as { error?: string }).error ?? "Please try again."}`,
            };
            setMessages((prev) => [...prev, errMsg]);
          }
        } else {
          const result = await generateAppMutation.mutateAsync({
            description: messageText,
            appName: intent.name,
          });

          if (result.success && result.app) {
            const code = (result.app as { mainFile?: string }).mainFile ?? JSON.stringify(result.app, null, 2);
            const newApp = addApp({
              type: "app",
              name: (result.app as { appName?: string }).appName ?? intent.name,
              description: (result.app as { description?: string }).description ?? messageText,
              code,
            });
            const assistantMsg: Message = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: `I've generated the **${newApp.name}** app! Tap the preview below to view and build it.`,
              generatedAppId: newApp.id,
              generatedAppName: newApp.name,
              generatedAppType: "app",
            };
            setMessages((prev) => [...prev, assistantMsg]);
          } else {
            const errMsg: Message = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: `Sorry, I couldn't generate the app. ${(result as { error?: string }).error ?? "Please try again."}`,
            };
            setMessages((prev) => [...prev, errMsg]);
          }
        }
      } else {
        // General chat
        const history = [...messages, userMsg].map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        const result = await chatMutation.mutateAsync({
          messages: history,
          notesContext,
          githubContext,
        });

        const { createdItems, deviceOutcomes } = await executeActions(result.actions ?? []);

        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.text,
          actions: result.actions,
          createdItems,
          deviceOutcomes,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      }

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item: msg }: { item: Message }) => {
    const isUser = msg.role === "user";
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <IconSymbol name="sparkles" size={14} color="#fff" />
          </View>
        )}
        <View style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: colors.primary }]
            : [styles.aiBubble, { backgroundColor: colors.surface, borderColor: colors.border }],
        ]}>
          <Text style={[styles.bubbleText, { color: isUser ? "#fff" : colors.foreground }]}>
            {msg.content}
          </Text>

          {/* Generated app preview link */}
          {msg.generatedAppId && (
            <TouchableOpacity
              style={[styles.previewLink, { backgroundColor: colors.primary + "18", borderColor: colors.primary }]}
              onPress={() => navToPreview(msg.generatedAppId!)}
            >
              <IconSymbol
                name={msg.generatedAppType === "website" ? "globe" : "hammer.fill"}
                size={14}
                color={colors.primary}
              />
              <Text style={[styles.previewLinkText, { color: colors.primary }]}>
                {msg.generatedAppType === "website" ? "View Website" : "View App"}: {msg.generatedAppName}
              </Text>
              <IconSymbol name="arrow.up.right" size={12} color={colors.primary} />
            </TouchableOpacity>
          )}

          {/* Created items */}
          {msg.createdItems && msg.createdItems.length > 0 && (
            <View style={[styles.createdItems, { borderTopColor: colors.border }]}>
              <Text style={[styles.createdLabel, { color: colors.muted }]}>
                Created {msg.createdItems.length} item{msg.createdItems.length !== 1 ? "s" : ""}:
              </Text>
              {msg.createdItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.createdItem}
                  onPress={() => {
                    if (item.type === "code") navToCode(item.id);
                    else if (item.type !== "folder") navToEditor(item.id);
                  }}
                >
                  <IconSymbol
                    name={
                      item.type === "folder"
                        ? "folder.fill"
                        : item.type === "code"
                        ? "chevron.left.forwardslash.chevron.right"
                        : "doc.text.fill"
                    }
                    size={12}
                    color={
                      item.type === "folder"
                        ? colors.warning
                        : item.type === "code"
                        ? (colors as Record<string, string>).accent ?? colors.primary
                        : colors.primary
                    }
                  />
                  <Text style={[styles.createdItemText, { color: colors.primary }]}>
                    {item.title}
                  </Text>
                  {item.type !== "folder" && (
                    <IconSymbol name="arrow.up.right" size={10} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Device / GitHub action outcomes */}
          {msg.deviceOutcomes && msg.deviceOutcomes.length > 0 && (
            <View style={[styles.createdItems, { borderTopColor: colors.border }]}>
              <Text style={[styles.createdLabel, { color: colors.muted }]}>
                Actions:
              </Text>
              {msg.deviceOutcomes.map((outcome, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.createdItem}
                  disabled={!outcome.detail}
                  onPress={() => outcome.detail && openUrl(outcome.detail)}
                >
                  <IconSymbol
                    name={outcome.success ? "checkmark.circle.fill" : "xmark.circle.fill"}
                    size={12}
                    color={outcome.success ? "#22c55e" : "#ef4444"}
                  />
                  <Text style={[styles.createdItemText, { color: outcome.success ? "#22c55e" : "#ef4444" }]}>
                    {outcome.title}
                  </Text>
                  {outcome.detail && (
                    <IconSymbol name="arrow.up.right" size={10} color="#22c55e" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer containerClassName="bg-background" edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={[styles.aiIcon, { backgroundColor: colors.primary }]}>
          <IconSymbol name="sparkles" size={18} color="#fff" />
        </View>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notewise AI</Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>
            Notes, device control & GitHub
          </Text>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => setMessages([])}
          >
            <IconSymbol name="trash.fill" size={16} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "22" }]}>
              <IconSymbol name="brain" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Ask me anything
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.muted }]}>
              I can create notes, folders, and code files. I can control your device (open apps, call, SMS, maps, settings). And I can commit code directly to your connected GitHub repo — including changes to this app itself.
            </Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.suggestion, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => sendMessage(s)}
                >
                  <Text style={[styles.suggestionText, { color: colors.foreground }]} numberOfLines={2}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Loading indicator */}
        {isLoading && (
          <View style={[styles.loadingRow, { borderTopColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <IconSymbol name="sparkles" size={14} color="#fff" />
            </View>
            <View style={[styles.loadingBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.muted }]}>Thinking...</Text>
            </View>
          </View>
        )}

        {/* Input */}
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
            value={input}
            onChangeText={setInput}
            placeholder="Ask AI to create notes, write code..."
            placeholderTextColor={colors.muted}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: input.trim() && !isLoading ? colors.primary : colors.border }]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || isLoading}
          >
            <IconSymbol name="paperplane.fill" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  aiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  headerSub: {
    fontSize: 12,
    marginTop: 1,
  },
  clearBtn: {
    marginLeft: "auto",
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  suggestions: {
    width: "100%",
    gap: 8,
  },
  suggestion: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  suggestionText: {
    fontSize: 13,
    lineHeight: 18,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 12,
  },
  messageRowUser: {
    flexDirection: "row-reverse",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 16,
    padding: 12,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 22,
  },
  createdItems: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
    gap: 6,
  },
  createdLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  createdItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  createdItemText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 0.5,
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 13,
    fontStyle: "italic",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    maxHeight: 100,
    lineHeight: 20,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  previewLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  previewLinkText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
});
