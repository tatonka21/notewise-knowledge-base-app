import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  // Tabs
  "house.fill": "home",
  "folder.fill": "folder",
  "sparkles": "auto-awesome",
  "chevron.left.forwardslash.chevron.right": "code",
  "gearshape.fill": "settings",
  "paperplane.fill": "send",
  // Navigation
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "chevron.down": "expand-more",
  "chevron.up": "expand-less",
  "xmark": "close",
  "arrow.left": "arrow-back",
  // Notes
  "doc.text.fill": "description",
  "doc.fill": "insert-drive-file",
  "note.text": "note",
  "pin.fill": "push-pin",
  "pin": "push-pin",
  "magnifyingglass": "search",
  "plus": "add",
  "plus.circle.fill": "add-circle",
  "trash.fill": "delete",
  "pencil": "edit",
  "pencil.line": "edit",
  "square.and.pencil": "edit-note",
  "eye": "visibility",
  "eye.slash": "visibility-off",
  // Tags
  "tag.fill": "label",
  "tag": "label-outline",
  // Links
  "link": "link",
  "arrow.up.right": "open-in-new",
  "arrow.uturn.backward": "undo",
  // Code
  "terminal.fill": "terminal",
  "curlybraces": "data-object",
  // GitHub
  "arrow.up.circle.fill": "upload",
  "arrow.down.circle.fill": "download",
  "clock.fill": "history",
  "checkmark.circle.fill": "check-circle",
  "exclamationmark.circle.fill": "error",
  "wifi.slash": "wifi-off",
  "wifi": "wifi",
  // AI
  "brain": "psychology",
  "wand.and.stars": "auto-fix-high",
  "bubble.left.fill": "chat-bubble",
  "bubble.right.fill": "chat",
  // Misc
  "square.and.arrow.up": "share",
  "ellipsis": "more-horiz",
  "ellipsis.circle": "more-horiz",
  "info.circle": "info",
  "moon.fill": "dark-mode",
  "sun.max.fill": "light-mode",
  "textformat.size": "format-size",
  "arrow.clockwise": "refresh",
  "checkmark": "check",
  "folder.badge.plus": "create-new-folder",
  "doc.badge.plus": "note-add",
  "rectangle.split.3x1": "view-column",
  "sidebar.left": "menu",
  "line.3.horizontal": "menu",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
