/**
 * Unit tests for lib/device-actions.ts
 *
 * Because the helpers call expo-linking, expo-web-browser, and
 * react-native's Share API — all native modules — we mock those modules
 * so the pure logic (URL building, error handling, fallback paths) can
 * be verified without a real device.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────
// vi.mock factories are hoisted, so we need vi.hoisted for the mock fns.

const {
  mockCanOpenURL,
  mockOpenURL,
  mockOpenSettings,
  mockOpenBrowserAsync,
  mockShare,
} = vi.hoisted(() => ({
  mockCanOpenURL: vi.fn(),
  mockOpenURL: vi.fn(),
  mockOpenSettings: vi.fn(),
  mockOpenBrowserAsync: vi.fn(),
  mockShare: vi.fn(),
}));

vi.mock("expo-linking", () => ({
  canOpenURL: mockCanOpenURL,
  openURL: mockOpenURL,
  openSettings: mockOpenSettings,
}));

vi.mock("expo-web-browser", () => ({
  openBrowserAsync: mockOpenBrowserAsync,
}));

vi.mock("react-native", () => ({
  Platform: { OS: "android" },
  Share: { share: mockShare },
}));

// Import AFTER mocks are set up
import {
  launchApp,
  makeCall,
  openMaps,
  openSettings,
  openUrl,
  sendEmail,
  sendSms,
  shareText,
} from "../lib/device-actions";

// ── Helpers ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockCanOpenURL.mockResolvedValue(true);
  mockOpenURL.mockResolvedValue(undefined);
  mockOpenSettings.mockResolvedValue(undefined);
  mockOpenBrowserAsync.mockResolvedValue({ type: "opened" });
  mockShare.mockResolvedValue({ action: "sharedAction" });
});

// ── openUrl ────────────────────────────────────────────────────────────────

describe("openUrl", () => {
  it("opens https URLs in the in-app browser", async () => {
    const result = await openUrl("https://example.com");
    expect(mockOpenBrowserAsync).toHaveBeenCalledWith("https://example.com");
    expect(result.success).toBe(true);
  });

  it("opens http URLs in the in-app browser", async () => {
    const result = await openUrl("http://example.com");
    expect(mockOpenBrowserAsync).toHaveBeenCalledWith("http://example.com");
    expect(result.success).toBe(true);
  });

  it("opens non-http URLs via Linking.openURL", async () => {
    const result = await openUrl("youtube://");
    expect(mockOpenURL).toHaveBeenCalledWith("youtube://");
    expect(result.success).toBe(true);
  });

  it("returns failure when URL cannot be opened", async () => {
    mockCanOpenURL.mockResolvedValue(false);
    const result = await openUrl("xyz://unknown");
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/No app found/);
  });

  it("returns failure on exception", async () => {
    mockOpenBrowserAsync.mockRejectedValue(new Error("browser error"));
    const result = await openUrl("https://fail.com");
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/browser error/);
  });
});

// ── launchApp ──────────────────────────────────────────────────────────────

describe("launchApp", () => {
  it("opens a URI deep link", async () => {
    const result = await launchApp("youtube://");
    expect(mockOpenURL).toHaveBeenCalledWith("youtube://");
    expect(result.success).toBe(true);
  });

  it("wraps bare package name in android-app:// on Android", async () => {
    const result = await launchApp("com.spotify.music");
    expect(mockOpenURL).toHaveBeenCalledWith("android-app://com.spotify.music");
    expect(result.success).toBe(true);
  });

  it("returns failure when app is not installed", async () => {
    mockCanOpenURL.mockResolvedValue(false);
    const result = await launchApp("notinstalled://");
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/App not found/);
  });
});

// ── makeCall ───────────────────────────────────────────────────────────────

describe("makeCall", () => {
  it("opens the dialer with tel: URI", async () => {
    const result = await makeCall("5551234567");
    expect(mockOpenURL).toHaveBeenCalledWith("tel:5551234567");
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/5551234567/);
  });

  it("returns failure when phone calls not supported", async () => {
    mockCanOpenURL.mockResolvedValue(false);
    const result = await makeCall("5551234567");
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not supported/);
  });
});

// ── sendSms ────────────────────────────────────────────────────────────────

describe("sendSms", () => {
  it("opens SMS with phone and body", async () => {
    const result = await sendSms("5551234567", "Hello!");
    expect(mockOpenURL).toHaveBeenCalledWith(
      expect.stringMatching(/^sms:5551234567.*Hello/),
    );
    expect(result.success).toBe(true);
  });

  it("opens SMS with phone only (no body)", async () => {
    const result = await sendSms("5551234567");
    expect(mockOpenURL).toHaveBeenCalledWith("sms:5551234567");
    expect(result.success).toBe(true);
  });
});

// ── sendEmail ──────────────────────────────────────────────────────────────

describe("sendEmail", () => {
  it("opens email with to, subject, and body", async () => {
    const result = await sendEmail("a@b.com", "Hi", "Hello there");
    const calledUrl = mockOpenURL.mock.calls[0][0] as string;
    expect(calledUrl).toMatch(/^mailto:a@b\.com/);
    expect(calledUrl).toMatch(/subject=Hi/);
    expect(calledUrl).toMatch(/body=Hello/);
    expect(result.success).toBe(true);
  });

  it("opens email with to only", async () => {
    const result = await sendEmail("a@b.com");
    expect(mockOpenURL).toHaveBeenCalledWith("mailto:a@b.com");
    expect(result.success).toBe(true);
  });
});

// ── shareText ──────────────────────────────────────────────────────────────

describe("shareText", () => {
  it("calls Share.share with the provided text", async () => {
    const result = await shareText("Hello world", "Test Share");
    expect(mockShare).toHaveBeenCalledWith({ message: "Hello world", title: "Test Share" });
    expect(result.success).toBe(true);
  });

  it("returns failure on Share error", async () => {
    mockShare.mockRejectedValue(new Error("share failed"));
    const result = await shareText("Hello");
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/share failed/);
  });
});

// ── openMaps ───────────────────────────────────────────────────────────────

describe("openMaps", () => {
  it("uses geo: URI on Android", async () => {
    const result = await openMaps("coffee shops");
    expect(mockOpenURL).toHaveBeenCalledWith(
      expect.stringMatching(/^geo:0,0\?q=coffee/),
    );
    expect(result.success).toBe(true);
  });

  it("falls back to Google Maps web when geo: not supported", async () => {
    mockCanOpenURL.mockResolvedValue(false);
    const result = await openMaps("pizza");
    expect(mockOpenBrowserAsync).toHaveBeenCalledWith(
      expect.stringContaining("google.com/maps"),
    );
    expect(result.success).toBe(true);
  });
});

// ── openSettings ───────────────────────────────────────────────────────────

describe("openSettings", () => {
  it("opens app settings when path is 'app'", async () => {
    const result = await openSettings("app");
    expect(mockOpenSettings).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it("falls back to main settings when intent URL not supported", async () => {
    mockCanOpenURL.mockResolvedValue(false);
    const result = await openSettings("wifi");
    expect(mockOpenSettings).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it("opens main settings when no path provided", async () => {
    const result = await openSettings();
    expect(mockOpenSettings).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});
