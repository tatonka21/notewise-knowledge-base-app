import { useState } from "react";
import {
  Alert,
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
import { navToCode, navToEditor } from "@/lib/nav";
import { NoteItem, useNotesStore } from "@/store/notes-store";

function FileTreeItem({
  item,
  depth,
  expandedFolders,
  toggleFolder,
  onLongPress,
}: {
  item: NoteItem;
  depth: number;
  expandedFolders: Set<string>;
  toggleFolder: (id: string) => void;
  onLongPress: (item: NoteItem) => void;
}) {
  const colors = useColors();
  const { getChildren } = useNotesStore();
  const children = getChildren(item.id);
  const isExpanded = expandedFolders.has(item.id);

  const getIcon = () => {
    if (item.type === "folder") {
      return isExpanded ? "folder.fill" : "folder.fill";
    }
    if (item.type === "code") return "chevron.left.forwardslash.chevron.right";
    return "doc.text.fill";
  };

  const getIconColor = () => {
    if (item.type === "folder") return colors.warning;
    if (item.type === "code") return (colors as Record<string, string>).accent ?? colors.primary;
    return colors.primary;
  };

  const handlePress = () => {
    if (item.type === "folder") {
      toggleFolder(item.id);
    } else if (item.type === "code") {
      navToCode(item.id);
    } else {
      navToEditor(item.id);
    }
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        onLongPress={() => onLongPress(item)}
        style={({ pressed }) => [
          styles.treeItem,
          { paddingLeft: 16 + depth * 20, borderBottomColor: colors.border },
          pressed && { backgroundColor: colors.primary + "11" },
        ]}
      >
        {item.type === "folder" && (
          <IconSymbol
            name={isExpanded ? "chevron.down" : "chevron.right"}
            size={12}
            color={colors.muted}
            style={{ marginRight: 4 }}
          />
        )}
        {item.type !== "folder" && <View style={{ width: 16 }} />}
        <IconSymbol name={getIcon()} size={16} color={getIconColor()} />
        <Text style={[styles.treeItemText, { color: colors.foreground }]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.pinned && (
          <IconSymbol name="pin.fill" size={10} color={(colors as Record<string, string>).accent ?? colors.primary} />
        )}
        {item.type === "folder" && children.length > 0 && (
          <Text style={[styles.childCount, { color: colors.muted }]}>{children.length}</Text>
        )}
      </Pressable>
      {item.type === "folder" && isExpanded && children.map((child) => (
        <FileTreeItem
          key={child.id}
          item={child}
          depth={depth + 1}
          expandedFolders={expandedFolders}
          toggleFolder={toggleFolder}
          onLongPress={onLongPress}
        />
      ))}
    </>
  );
}

export default function ExplorerScreen() {
  const colors = useColors();
  const { items, createItem, deleteItem, updateItem, getChildren } = useNotesStore();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextItem, setContextItem] = useState<NoteItem | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [newItemParent, setNewItemParent] = useState<string | null>(null);

  const rootItems = getChildren(null).sort((a, b) => {
    if (a.type === "folder" && b.type !== "folder") return -1;
    if (a.type !== "folder" && b.type === "folder") return 1;
    return a.title.localeCompare(b.title);
  });

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLongPress = (item: NoteItem) => {
    setContextItem(item);
  };

  const handleRename = () => {
    if (!contextItem) return;
    setRenaming(contextItem.id);
    setRenameText(contextItem.title);
    setContextItem(null);
  };

  const handleDelete = () => {
    if (!contextItem) return;
    Alert.alert(
      "Delete",
      `Delete "${contextItem.title}"${contextItem.type === "folder" ? " and all its contents" : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteItem(contextItem.id);
            setContextItem(null);
          },
        },
      ]
    );
  };

  const handleNewChild = (type: "note" | "code" | "folder") => {
    const parentId = contextItem?.type === "folder" ? contextItem.id : (contextItem?.parentId ?? null);
    createItem({ title: type === "folder" ? "New Folder" : type === "code" ? "Untitled Code" : "Untitled Note", type, parentId });
    if (parentId) {
      setExpandedFolders((prev) => new Set([...prev, parentId]));
    }
    setContextItem(null);
    setShowNewMenu(false);
  };

  const handleNewRoot = (type: "note" | "code" | "folder") => {
    createItem({ title: type === "folder" ? "New Folder" : type === "code" ? "Untitled Code" : "Untitled Note", type, parentId: null });
    setShowNewMenu(false);
  };

  const totalItems = items.length;
  const folderCount = items.filter((i) => i.type === "folder").length;
  const noteCount = items.filter((i) => i.type !== "folder").length;

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Explorer</Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>
            {folderCount} folders · {noteCount} files
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowNewMenu((v) => !v)}
        >
          <IconSymbol name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* New item menu */}
      {showNewMenu && (
        <View style={[styles.newMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.newMenuItem} onPress={() => handleNewRoot("note")}>
            <IconSymbol name="doc.text.fill" size={16} color={colors.primary} />
            <Text style={[styles.newMenuText, { color: colors.foreground }]}>New Note</Text>
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.newMenuItem} onPress={() => handleNewRoot("code")}>
            <IconSymbol name="chevron.left.forwardslash.chevron.right" size={16} color={(colors as Record<string, string>).accent ?? colors.primary} />
            <Text style={[styles.newMenuText, { color: colors.foreground }]}>New Code File</Text>
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.newMenuItem} onPress={() => handleNewRoot("folder")}>
            <IconSymbol name="folder.fill" size={16} color={colors.warning} />
            <Text style={[styles.newMenuText, { color: colors.foreground }]}>New Folder</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* File tree */}
      <FlatList
        data={rootItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FileTreeItem
            item={item}
            depth={0}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
            onLongPress={handleLongPress}
          />
        )}
        contentContainerStyle={styles.treeContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="folder.fill" size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Empty Vault</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Tap + to create your first note or folder
            </Text>
          </View>
        }
      />

      {/* Rename input */}
      {renaming && (
        <View style={[styles.renameOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.renameDialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.renameTitle, { color: colors.foreground }]}>Rename</Text>
            <TextInput
              style={[styles.renameInput, { color: colors.foreground, borderColor: colors.border }]}
              value={renameText}
              onChangeText={setRenameText}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => {
                if (renameText.trim()) {
                  updateItem(renaming, { title: renameText.trim() });
                }
                setRenaming(null);
              }}
            />
            <View style={styles.renameActions}>
              <TouchableOpacity onPress={() => setRenaming(null)}>
                <Text style={[styles.renameCancel, { color: colors.muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (renameText.trim()) updateItem(renaming, { title: renameText.trim() });
                  setRenaming(null);
                }}
              >
                <Text style={[styles.renameConfirm, { color: colors.primary }]}>Rename</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Context menu */}
      {contextItem && (
        <Pressable style={styles.contextOverlay} onPress={() => setContextItem(null)}>
          <View style={[styles.contextMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.contextTitle, { color: colors.muted }]} numberOfLines={1}>
              {contextItem.title}
            </Text>
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.contextItem} onPress={handleRename}>
              <IconSymbol name="pencil" size={16} color={colors.foreground} />
              <Text style={[styles.contextItemText, { color: colors.foreground }]}>Rename</Text>
            </TouchableOpacity>
            {contextItem.type === "folder" && (
              <>
                <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.contextItem} onPress={() => handleNewChild("note")}>
                  <IconSymbol name="doc.text.fill" size={16} color={colors.primary} />
                  <Text style={[styles.contextItemText, { color: colors.foreground }]}>New Note Inside</Text>
                </TouchableOpacity>
                <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.contextItem} onPress={() => handleNewChild("code")}>
                  <IconSymbol name="chevron.left.forwardslash.chevron.right" size={16} color={(colors as Record<string, string>).accent ?? colors.primary} />
                  <Text style={[styles.contextItemText, { color: colors.foreground }]}>New Code File Inside</Text>
                </TouchableOpacity>
                <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.contextItem} onPress={() => handleNewChild("folder")}>
                  <IconSymbol name="folder.fill" size={16} color={colors.warning} />
                  <Text style={[styles.contextItemText, { color: colors.foreground }]}>New Subfolder</Text>
                </TouchableOpacity>
              </>
            )}
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.contextItem} onPress={handleDelete}>
              <IconSymbol name="trash.fill" size={16} color={colors.error} />
              <Text style={[styles.contextItemText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  newBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  newMenu: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  newMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  newMenuText: {
    fontSize: 14,
    fontWeight: "500",
  },
  menuDivider: { height: 0.5 },
  treeContainer: { paddingBottom: 100 },
  treeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingRight: 16,
    borderBottomWidth: 0.5,
  },
  treeItemText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  childCount: {
    fontSize: 11,
    fontWeight: "600",
    minWidth: 18,
    textAlign: "right",
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
    paddingHorizontal: 40,
  },
  renameOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  renameDialog: {
    width: "85%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  renameTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  renameInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  renameActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
  },
  renameCancel: { fontSize: 15, fontWeight: "500" },
  renameConfirm: { fontSize: 15, fontWeight: "700" },
  contextOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    paddingBottom: 100,
    paddingHorizontal: 16,
    zIndex: 20,
  },
  contextMenu: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  contextTitle: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingVertical: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  contextItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  contextItemText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
