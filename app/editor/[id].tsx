import { useLocalSearchParams, useRouter } from "expo-router";
import { navToCode, navToEditor } from "@/lib/nav";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { NoteItem, extractWikiLinks, useNotesStore } from "@/store/notes-store";

// Simple markdown renderer for preview mode
function MarkdownPreview({ content, onLinkPress, colors }: {
  content: string;
  onLinkPress: (title: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const lines = content.split("\n");

  const renderLine = (line: string, idx: number) => {
    // Headings
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);
    if (h1) return <Text key={idx} style={[styles.h1, { color: colors.foreground }]}>{h1[1]}</Text>;
    if (h2) return <Text key={idx} style={[styles.h2, { color: colors.foreground }]}>{h2[1]}</Text>;
    if (h3) return <Text key={idx} style={[styles.h3, { color: colors.foreground }]}>{h3[1]}</Text>;

    // Horizontal rule
    if (line.match(/^---+$/)) {
      return <View key={idx} style={[styles.hr, { backgroundColor: colors.border }]} />;
    }

    // Empty line
    if (!line.trim()) return <View key={idx} style={styles.emptyLine} />;

    // Bullet list
    const bullet = line.match(/^[-*] (.+)/);
    if (bullet) {
      return (
        <View key={idx} style={styles.bulletRow}>
          <Text style={[styles.bulletDot, { color: colors.primary }]}>•</Text>
          <Text style={[styles.bodyText, { color: colors.foreground }]}>{renderInline(bullet[1], onLinkPress, colors)}</Text>
        </View>
      );
    }

    // Numbered list
    const numbered = line.match(/^(\d+)\. (.+)/);
    if (numbered) {
      return (
        <View key={idx} style={styles.bulletRow}>
          <Text style={[styles.bulletDot, { color: colors.primary }]}>{numbered[1]}.</Text>
          <Text style={[styles.bodyText, { color: colors.foreground }]}>{renderInline(numbered[2], onLinkPress, colors)}</Text>
        </View>
      );
    }

    // Blockquote
    const quote = line.match(/^> (.+)/);
    if (quote) {
      return (
        <View key={idx} style={[styles.blockquote, { borderLeftColor: colors.primary }]}>
          <Text style={[styles.bodyText, { color: colors.muted }]}>{renderInline(quote[1], onLinkPress, colors)}</Text>
        </View>
      );
    }

    // Code block line
    if (line.startsWith("    ") || line.startsWith("\t")) {
      return (
        <View key={idx} style={[styles.codeBlock, { backgroundColor: (colors as Record<string, string>).codebg ?? colors.surface }]}>
          <Text style={[styles.codeText, { color: colors.success }]}>{line.trim()}</Text>
        </View>
      );
    }

    return (
      <Text key={idx} style={[styles.bodyText, { color: colors.foreground }]}>
        {renderInline(line, onLinkPress, colors)}
      </Text>
    );
  };

  return (
    <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewContent}>
      {lines.map((line, idx) => renderLine(line, idx))}
    </ScrollView>
  );
}

function renderInline(
  text: string,
  onLinkPress: (title: string) => void,
  colors: ReturnType<typeof useColors>
): React.ReactNode {
  // Split by [[links]], **bold**, `code`, *italic*
  const parts: React.ReactNode[] = [];
  const regex = /(\[\[([^\]]+)\]\]|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;
  let last = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[1].startsWith("[[")) {
      const title = match[2];
      parts.push(
        <Text
          key={match.index}
          style={{ color: (colors as Record<string, string>).accent ?? colors.primary, fontWeight: "600" }}
          onPress={() => onLinkPress(title)}
        >
          {title}
        </Text>
      );
    } else if (match[1].startsWith("**")) {
      parts.push(<Text key={match.index} style={{ fontWeight: "700", color: colors.foreground }}>{match[3]}</Text>);
    } else if (match[1].startsWith("`")) {
      parts.push(
        <Text key={match.index} style={{ fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", backgroundColor: (colors as Record<string, string>).codebg ?? colors.surface, color: colors.success, paddingHorizontal: 4, borderRadius: 4 }}>
          {match[4]}
        </Text>
      );
    } else if (match[1].startsWith("*")) {
      parts.push(<Text key={match.index} style={{ fontStyle: "italic", color: colors.foreground }}>{match[5]}</Text>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { getItem, updateItem, items, togglePin } = useNotesStore();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [showBacklinks, setShowBacklinks] = useState(false);
  const [wikiQuery, setWikiQuery] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState(0);
  const contentRef = useRef<TextInput>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const item = getItem(id);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setContent(item.content);
    }
  }, [id]);

  const scheduleSave = (newTitle: string, newContent: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateItem(id, { title: newTitle, content: newContent });
    }, 800);
  };

  const handleTitleChange = (t: string) => {
    setTitle(t);
    scheduleSave(t, content);
  };

  const handleContentChange = (c: string) => {
    setContent(c);
    scheduleSave(title, c);

    // Detect [[link trigger
    const beforeCursor = c.slice(0, cursorPos + (c.length - content.length));
    const linkMatch = beforeCursor.match(/\[\[([^\]]*)$/);
    if (linkMatch) {
      setWikiQuery(linkMatch[1]);
    } else {
      setWikiQuery(null);
    }
  };

  const insertWikiLink = (targetTitle: string) => {
    // Find the [[ and replace up to cursor
    const beforeCursor = content.slice(0, cursorPos);
    const linkStart = beforeCursor.lastIndexOf("[[");
    if (linkStart === -1) return;
    const newContent =
      content.slice(0, linkStart) + `[[${targetTitle}]]` + content.slice(cursorPos);
    setContent(newContent);
    setWikiQuery(null);
    updateItem(id, { content: newContent });
  };

  const handleLinkPress = (linkTitle: string) => {
    const target = items.find((i) => i.title.toLowerCase() === linkTitle.toLowerCase());
    if (target) {
      if (target.type === "code") {
        navToCode(target.id);
      } else {
        navToEditor(target.id);
      }
    }
  };

  // Wiki link suggestions
  const wikiSuggestions =
    wikiQuery !== null
      ? items
          .filter(
            (i) =>
              i.type !== "folder" &&
              i.id !== id &&
              i.title.toLowerCase().includes(wikiQuery.toLowerCase())
          )
          .slice(0, 6)
      : [];

  // Backlinks
  const backlinks = items.filter((i) => {
    if (i.id === id || i.type === "folder") return false;
    const links = extractWikiLinks(i.content);
    return links.some((l) => l.toLowerCase() === (item?.title ?? "").toLowerCase());
  });

  const toolbarActions = [
    { label: "B", action: () => wrapSelection("**", "**"), tooltip: "Bold" },
    { label: "I", action: () => wrapSelection("*", "*"), tooltip: "Italic" },
    { label: "H1", action: () => prefixLine("# "), tooltip: "Heading 1" },
    { label: "H2", action: () => prefixLine("## "), tooltip: "Heading 2" },
    { label: "[[", action: () => insertText("[["), tooltip: "Wiki Link" },
    { label: "`", action: () => wrapSelection("`", "`"), tooltip: "Code" },
    { label: "- ", action: () => prefixLine("- "), tooltip: "List" },
    { label: "> ", action: () => prefixLine("> "), tooltip: "Quote" },
  ];

  const wrapSelection = (before: string, after: string) => {
    const newContent = content + before + after;
    setContent(newContent);
    scheduleSave(title, newContent);
  };

  const prefixLine = (prefix: string) => {
    const newContent = content + "\n" + prefix;
    setContent(newContent);
    scheduleSave(title, newContent);
  };

  const insertText = (text: string) => {
    const newContent = content + text;
    setContent(newContent);
    setWikiQuery("");
    scheduleSave(title, newContent);
  };

  if (!item) {
    return (
      <ScreenContainer>
        <Text style={{ color: colors.muted, textAlign: "center", marginTop: 40 }}>Note not found</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowBacklinks((v) => !v)}
          >
            <IconSymbol name="link" size={18} color={showBacklinks ? colors.primary : colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => togglePin(id)}
          >
            <IconSymbol name={item.pinned ? "pin.fill" : "pin"} size={18} color={item.pinned ? colors.primary : colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.previewToggle, { backgroundColor: preview ? colors.primary : colors.surface, borderColor: colors.border }]}
            onPress={() => setPreview((v) => !v)}
          >
            <IconSymbol name={preview ? "pencil" : "eye"} size={16} color={preview ? "#fff" : colors.muted} />
            <Text style={[styles.previewToggleText, { color: preview ? "#fff" : colors.muted }]}>
              {preview ? "Edit" : "Preview"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Backlinks panel */}
      {showBacklinks && (
        <View style={[styles.backlinksPanel, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.backlinkTitle, { color: colors.muted }]}>
            {backlinks.length} backlink{backlinks.length !== 1 ? "s" : ""}
          </Text>
          {backlinks.map((bl) => (
            <TouchableOpacity
              key={bl.id}
              style={styles.backlinkItem}
              onPress={() => navToEditor(bl.id)}
            >
              <IconSymbol name="doc.text.fill" size={12} color={colors.primary} />
              <Text style={[styles.backlinkText, { color: colors.primary }]}>{bl.title}</Text>
            </TouchableOpacity>
          ))}
          {backlinks.length === 0 && (
            <Text style={[styles.backlinkEmpty, { color: colors.muted }]}>No notes link here yet</Text>
          )}
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Title */}
        <TextInput
          style={[styles.titleInput, { color: colors.foreground, borderBottomColor: colors.border }]}
          value={title}
          onChangeText={handleTitleChange}
          placeholder="Note title..."
          placeholderTextColor={colors.muted}
          returnKeyType="done"
        />

        {/* Content */}
        {preview ? (
          <MarkdownPreview content={content} onLinkPress={handleLinkPress} colors={colors} />
        ) : (
          <TextInput
            ref={contentRef}
            style={[
              styles.contentInput,
              {
                color: colors.foreground,
                backgroundColor: colors.background,
                fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
              },
            ]}
            value={content}
            onChangeText={handleContentChange}
            onSelectionChange={(e) => setCursorPos(e.nativeEvent.selection.end)}
            placeholder="Start writing... Type [[ to link to another note"
            placeholderTextColor={colors.muted}
            multiline
            textAlignVertical="top"
          />
        )}

        {/* Wiki link autocomplete */}
        {wikiQuery !== null && wikiSuggestions.length > 0 && (
          <View style={[styles.wikiSuggest, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FlatList
              data={wikiSuggestions}
              keyExtractor={(i) => i.id}
              renderItem={({ item: suggestion }) => (
                <TouchableOpacity
                  style={[styles.wikiSuggestItem, { borderBottomColor: colors.border }]}
                  onPress={() => insertWikiLink(suggestion.title)}
                >
                  <IconSymbol name="doc.text.fill" size={14} color={colors.primary} />
                  <Text style={[styles.wikiSuggestText, { color: colors.foreground }]}>
                    {suggestion.title}
                  </Text>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="always"
            />
          </View>
        )}

        {/* Toolbar */}
        {!preview && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.toolbar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}
            contentContainerStyle={styles.toolbarContent}
            keyboardShouldPersistTaps="always"
          >
            {toolbarActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={[styles.toolbarBtn, { borderColor: colors.border }]}
                onPress={action.action}
              >
                <Text style={[styles.toolbarBtnText, { color: colors.foreground }]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    padding: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerBtn: {
    padding: 6,
  },
  previewToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  previewToggleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  backlinksPanel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  backlinkTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  backlinkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  backlinkText: {
    fontSize: 13,
    fontWeight: "500",
  },
  backlinkEmpty: {
    fontSize: 13,
    fontStyle: "italic",
  },
  titleInput: {
    fontSize: 22,
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  contentInput: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  wikiSuggest: {
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 4,
    overflow: "hidden",
  },
  wikiSuggestItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  wikiSuggestText: {
    fontSize: 14,
    fontWeight: "500",
  },
  toolbar: {
    borderTopWidth: 0.5,
    maxHeight: 44,
  },
  toolbarContent: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    alignItems: "center",
  },
  toolbarBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 32,
    alignItems: "center",
  },
  toolbarBtnText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  // Preview styles
  previewScroll: { flex: 1 },
  previewContent: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 40 },
  h1: { fontSize: 26, fontWeight: "800", marginBottom: 8, marginTop: 12, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: "700", marginBottom: 6, marginTop: 10 },
  h3: { fontSize: 17, fontWeight: "600", marginBottom: 4, marginTop: 8 },
  bodyText: { fontSize: 15, lineHeight: 24, marginBottom: 4 },
  bulletRow: { flexDirection: "row", gap: 8, marginBottom: 4, paddingLeft: 4 },
  bulletDot: { fontSize: 15, lineHeight: 24, width: 16 },
  blockquote: { borderLeftWidth: 3, paddingLeft: 12, marginVertical: 4 },
  codeBlock: { padding: 8, borderRadius: 6, marginVertical: 4 },
  codeText: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 13 },
  hr: { height: 1, marginVertical: 12 },
  emptyLine: { height: 8 },
});
