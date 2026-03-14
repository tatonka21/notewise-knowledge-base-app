import { describe, expect, it } from "vitest";

import { getModulesByCategory, moduleCatalog, moduleCategories } from "../constants/module-catalog";

describe("moduleCatalog", () => {
  it("contains all requested modules", () => {
    expect(moduleCatalog).toHaveLength(28);
    expect(moduleCatalog.map((module) => module.id)).toEqual(Array.from({ length: 28 }, (_, index) => index + 1));
  });

  it("assigns every module to a known category", () => {
    const categoryIds = new Set(moduleCategories.map((category) => category.id));
    moduleCatalog.forEach((module) => {
      expect(categoryIds.has(module.categoryId)).toBe(true);
    });
  });

  it("returns grouped modules by category", () => {
    expect(getModulesByCategory("A")).toHaveLength(5);
    expect(getModulesByCategory("B")).toHaveLength(5);
    expect(getModulesByCategory("C")).toHaveLength(5);
    expect(getModulesByCategory("D")).toHaveLength(5);
    expect(getModulesByCategory("E")).toHaveLength(5);
    expect(getModulesByCategory("F")).toHaveLength(3);
  });
});
