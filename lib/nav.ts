/**
 * Navigation helpers that cast routes to avoid typed-routes TS errors
 * while keeping runtime behavior correct.
 */
import { router } from "expo-router";

export function navToEditor(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router.push({ pathname: "/editor/[id]" as any, params: { id } });
}

export function navToCode(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router.push({ pathname: "/code/[id]" as any, params: { id } });
}

export function navToExplorer() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router.push("/(tabs)/explorer" as any);
}

export function navToNote(item: { id: string; type: string }) {
  if (item.type === "code") {
    navToCode(item.id);
  } else {
    navToEditor(item.id);
  }
}

export function navToPreview(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router.push({ pathname: "/preview/[id]" as any, params: { id } });
}
