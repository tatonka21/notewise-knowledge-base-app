/**
 * Device action helpers — execute AI-requested device-level interactions.
 *
 * All actions use standard Android/iOS intents via expo-linking or the
 * React Native Share API. No special permissions or root access is needed;
 * the operating system's normal intent-dispatch system handles each request
 * and the user remains in full control at every step.
 */

import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform, Share } from "react-native";

export type DeviceActionResult = {
  success: boolean;
  /** Short human-readable description of what happened. */
  message: string;
};

/** Open a web URL in the in-app browser, or any other URL via the OS. */
export async function openUrl(url: string): Promise<DeviceActionResult> {
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      await WebBrowser.openBrowserAsync(url);
      return { success: true, message: `Opened ${url} in browser.` };
    }
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      return { success: false, message: `No app found that can open: ${url}` };
    }
    await Linking.openURL(url);
    return { success: true, message: `Opened ${url}.` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, message: `Failed to open URL: ${msg}` };
  }
}

/**
 * Launch another app using any URI / deep link.
 * Examples:
 *   "youtube://"          → opens YouTube
 *   "com.spotify.music"  → opens Spotify (Android-only package intent)
 *   "fb://"              → opens Facebook
 */
export async function launchApp(uri: string): Promise<DeviceActionResult> {
  try {
    // Android package intent: android-app://com.example.app
    const effectiveUri =
      Platform.OS === "android" && !uri.includes("://")
        ? `android-app://${uri}`
        : uri;
    const supported = await Linking.canOpenURL(effectiveUri);
    if (!supported) {
      return {
        success: false,
        message: `App not found or cannot be opened: ${uri}`,
      };
    }
    await Linking.openURL(effectiveUri);
    return { success: true, message: `Launched app: ${uri}` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, message: `Failed to launch app: ${msg}` };
  }
}

/** Open the phone dialer pre-filled with a number. */
export async function makeCall(phoneNumber: string): Promise<DeviceActionResult> {
  try {
    const url = `tel:${phoneNumber}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      return { success: false, message: "Phone calls not supported on this device." };
    }
    await Linking.openURL(url);
    return { success: true, message: `Opened dialer for ${phoneNumber}.` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, message: `Failed to open dialer: ${msg}` };
  }
}

/** Open the SMS app pre-filled with a number and optional body text. */
export async function sendSms(
  phoneNumber: string,
  body?: string,
): Promise<DeviceActionResult> {
  try {
    const encodedBody = body ? encodeURIComponent(body) : "";
    // The separator between number and body differs by platform.
    const url =
      Platform.OS === "ios"
        ? `sms:${phoneNumber}${encodedBody ? `&body=${encodedBody}` : ""}`
        : `sms:${phoneNumber}${encodedBody ? `?body=${encodedBody}` : ""}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      return { success: false, message: "SMS not supported on this device." };
    }
    await Linking.openURL(url);
    return { success: true, message: `Opened SMS composer for ${phoneNumber}.` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, message: `Failed to open SMS: ${msg}` };
  }
}

/** Open the email app pre-filled with recipient, subject, and body. */
export async function sendEmail(
  to: string,
  subject?: string,
  body?: string,
): Promise<DeviceActionResult> {
  try {
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (body) params.set("body", body);
    const qs = params.toString();
    const url = `mailto:${to}${qs ? `?${qs}` : ""}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      return { success: false, message: "Email app not available on this device." };
    }
    await Linking.openURL(url);
    return { success: true, message: `Opened email composer to ${to}.` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, message: `Failed to open email: ${msg}` };
  }
}

/** Open the native share sheet to send text to any installed app. */
export async function shareText(
  text: string,
  title?: string,
): Promise<DeviceActionResult> {
  try {
    await Share.share({ message: text, title });
    return { success: true, message: "Share sheet opened." };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, message: `Failed to share: ${msg}` };
  }
}

/** Open the maps app (or Google Maps web fallback) for a search query. */
export async function openMaps(query: string): Promise<DeviceActionResult> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url =
      Platform.OS === "ios"
        ? `maps:?q=${encodedQuery}`
        : `geo:0,0?q=${encodedQuery}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return { success: true, message: `Opened maps for "${query}".` };
    }
    // Fallback: Google Maps in browser
    await WebBrowser.openBrowserAsync(
      `https://www.google.com/maps/search/${encodedQuery}`,
    );
    return { success: true, message: `Opened Google Maps for "${query}".` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, message: `Failed to open maps: ${msg}` };
  }
}

/**
 * Open the system Settings.
 * `path` can be:
 *   "app"         → this app's settings page
 *   "wifi"        → Wi-Fi settings (Android: android.settings.WIFI_SETTINGS)
 *   "bluetooth"   → Bluetooth settings
 *   "location"    → Location settings
 *   "display"     → Display settings
 *   "sound"       → Sound settings
 *   "apps"        → App management screen
 *   (default/any) → Main settings screen
 */
export async function openSettings(path?: string): Promise<DeviceActionResult> {
  try {
    if (!path || path === "app") {
      await Linking.openSettings();
      return { success: true, message: "Opened app settings." };
    }

    const ANDROID_SETTINGS: Record<string, string> = {
      wifi: "android.settings.WIFI_SETTINGS",
      bluetooth: "android.settings.BLUETOOTH_SETTINGS",
      location: "android.settings.LOCATION_SOURCE_SETTINGS",
      display: "android.settings.DISPLAY_SETTINGS",
      sound: "android.settings.SOUND_SETTINGS",
      apps: "android.settings.APPLICATION_SETTINGS",
    };

    const action = ANDROID_SETTINGS[path.toLowerCase()];
    if (action && Platform.OS === "android") {
      // intent:// scheme for explicit Android intents
      const intentUrl = `intent:#Intent;action=${action};end`;
      const supported = await Linking.canOpenURL(intentUrl);
      if (supported) {
        await Linking.openURL(intentUrl);
        return { success: true, message: `Opened ${path} settings.` };
      }
    }

    // Fallback: main settings
    await Linking.openSettings();
    return { success: true, message: "Opened settings." };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, message: `Failed to open settings: ${msg}` };
  }
}
