/**
 * React Native-compatible UUID v4 generator.
 * Does not rely on crypto.getRandomValues() which is not available in React Native.
 * Uses Math.random() instead for simplicity.
 */

export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
