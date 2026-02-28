import { describe, it, expect } from "vitest";
import { generateUUID } from "../lib/uuid";

describe("generateUUID", () => {
  it("generates a valid UUID v4 format", () => {
    const uuid = generateUUID();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuid).toMatch(uuidRegex);
  });

  it("generates unique UUIDs", () => {
    const uuid1 = generateUUID();
    const uuid2 = generateUUID();
    const uuid3 = generateUUID();
    expect(uuid1).not.toBe(uuid2);
    expect(uuid2).not.toBe(uuid3);
    expect(uuid1).not.toBe(uuid3);
  });

  it("generates UUIDs with correct length", () => {
    const uuid = generateUUID();
    expect(uuid.length).toBe(36); // 32 hex chars + 4 hyphens
  });

  it("has version 4 in the correct position", () => {
    const uuid = generateUUID();
    const parts = uuid.split("-");
    expect(parts[2][0]).toBe("4"); // Third group starts with 4 for v4
  });
});
