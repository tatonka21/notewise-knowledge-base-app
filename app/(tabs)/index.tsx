import { useRouter } from "expo-router";
import { navToCode, navToEditor, navToExplorer } from "@/lib/nav";
import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { NoteItem, useNotesStore } from "@/store/notes-store";

type ListRow =
  | { kind: "header"; label: string; id: string }
  | { kind: "note"; item: NoteItem };

function NoteCard({ item, onPress }: { item: NoteItem; onPress: () => void }) {
  const colors = useColors();
  const preview = item.content
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .trim()
    .slice(0, 100);

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.noteCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.75 },
      ]}
    >
      <View style={styles.noteCardHeader}>
        <View style={styles.noteCardTitleRow}>
          <IconSymbol
            name={item.type === "code" ? "chevron.left.forwardslash.chevron.right" : "doc.text.fill"}
            size={14}
            color={item.type === "code" ? (colors as Record<string, string>).accent ?? colors.primary : colors.primary}
          />
          <Text style={[styles.noteTitle, { color: colors.foreground }]} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        {item.pinned && (
          <IconSymbol name="pin.fill" size={12} color={(colors as Record<string, string>).accent ?? colors.primary} />
        )}
      </View>
      <Text style={[styles.notePreview, { color: colors.muted }]} numberOfLines={2}>
        {preview || "Empty note"}
      </Text>
      <View style={styles.noteCardFooter}>
        <Text style={[styles.noteTime, { color: colors.muted }]}>{timeAgo(item.updatedAt)}</Text>
        {item.tags.length > 0 && (
          <View style={styles.tagRow}>
            {item.tags.slice(0, 2).map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.primary + "22" }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function NotesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { items, load, loaded, createItem } = useNotesStore();
  const [search, setSearch] = useState("");
  const [showNewMenu, setShowNewMenu] = useState(false);

  useEffect(() => {
    if (!loaded) load();
  }, []);

  const notes = items.filter((i) => i.type !== "folder");
  const pinned = notes.filter((i) => i.pinned);
  const recent = notes
    .filter((i) => !i.pinned)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const filtered: NoteItem[] | null = search.trim()
    ? notes.filter(
        (i) =>
          i.title.toLowerCase().includes(search.toLowerCase()) ||
          i.content.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const openNote = (item: NoteItem) => {
    if (item.type === "code") {
      navToCode(item.id);
    } else {
      navToEditor(item.id);
    }
  };

  const handleNewNote = () => {
    setShowNewMenu(false);
    const note = createItem({ title: "Untitled Note", type: "note" });
    navToEditor(note.id);
  };

  const handleNewCode = () => {
    setShowNewMenu(false);
    const note = createItem({ title: "Untitled Code", type: "code", language: "javascript" });
    navToCode(note.id);
  };

  const handleNewFolder = () => {
    setShowNewMenu(false);
    createItem({ title: "New Folder", type: "folder" });
    navToExplorer();
  };

  const listData: ListRow[] = filtered
    ? filtered.map((item) => ({ kind: "note", item }))
    : [
        ...(pinned.length > 0 ? [{ kind: "header" as const, label: "Pinned", id: "__pinned__" }] : []),
        ...pinned.map((item) => ({ kind: "note" as const, item })),
        ...(recent.length > 0 ? [{ kind: "header" as const, label: "Recent", id: "__recent__" }] : []),
        ...recent.map((item) => ({ kind: "note" as const, item })),
      ];

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notewise</Text>
        <Text style={[styles.headerCount, { color: colors.muted }]}>
          {notes.length} {notes.length === 1 ? "note" : "notes"}
        </Text>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search notes..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <IconSymbol name="xmark" size={16} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {/* Notes list */}
      <FlatList
        data={listData}
        keyExtractor={(row) => (row.kind === "header" ? row.id : row.item.id)}
        renderItem={({ item: row }) => {
          if (row.kind === "header") {
            return (
              <Text style={[styles.sectionHeader, { color: colors.muted }]}>{row.label}</Text>
            );
          }
          return <NoteCard item={row.item} onPress={() => openNote(row.item)} />;
        }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          filtered ? (
            <Text style={[styles.emptyText, { color: colors.muted, textAlign: "center", paddingTop: 40 }]}>
              No results found
            </Text>
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol name="doc.text.fill" size={48} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Notes Yet</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Tap the + button to create your first note
              </Text>
            </View>
          )
        }
      />

      {/* New menu overlay */}
      {showNewMenu && (
        <Pressable style={styles.overlay} onPress={() => setShowNewMenu(false)}>
          <View style={[styles.newMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.newMenuItem} onPress={handleNewNote}>
              <IconSymbol name="doc.text.fill" size={20} color={colors.primary} />
              <Text style={[styles.newMenuText, { color: colors.foreground }]}>New Note</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.newMenuItem} onPress={handleNewCode}>
              <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={(colors as Record<string, string>).accent ?? colors.primary} />
              <Text style={[styles.newMenuText, { color: colors.foreground }]}>New Code File</Text>
            </TouchableOpacity>
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.newMenuItem} onPress={handleNewFolder}>
              <IconSymbol name="folder.fill" size={20} color={colors.warning} />
              <Text style={[styles.newMenuText, { color: colors.foreground }]}>New Folder</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setShowNewMenu((v) => !v)}
        activeOpacity={0.85}
      >
        <IconSymbol name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerCount: {
    fontSize: 13,
    fontWeight: "500",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  noteCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  noteCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  noteCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  notePreview: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  noteCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  noteTime: {
    fontSize: 11,
  },
  tagRow: {
    flexDirection: "row",
    gap: 4,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
    paddingBottom: 100,
    paddingRight: 16,
    alignItems: "flex-end",
    zIndex: 10,
  },
  newMenu: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    minWidth: 200,
  },
  newMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  newMenuText: {
    fontSize: 15,
    fontWeight: "500",
  },
  menuDivider: {
    height: 0.5,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 5,
  },
});
