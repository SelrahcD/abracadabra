import { findRefactoring, listRefactorings } from "./registry";

describe("registry", () => {
  it("lists every refactoring with a name and title", () => {
    const list = listRefactorings();
    expect(list.length).toBeGreaterThan(30);
    list.forEach((r) => {
      expect(typeof r.name).toBe("string");
      expect(typeof r.title).toBe("string");
      expect(r.name).not.toMatch(/highlight/i);
    });
  });

  it("excludes highlight commands", () => {
    const names = listRefactorings().map((r) => r.name);
    expect(names).not.toContain("toggle-highlight");
    expect(names).not.toContain("refresh-highlights");
    expect(names).not.toContain("remove-all-highlights");
  });

  it("resolves a refactoring by kebab-case name", () => {
    expect(findRefactoring("rename-symbol")?.command.key).toBe("renameSymbol");
  });

  it("resolves a refactoring by camelCase command key", () => {
    expect(findRefactoring("renameSymbol")?.command.key).toBe("renameSymbol");
  });

  it("returns undefined for unknown names", () => {
    expect(findRefactoring("does-not-exist")).toBeUndefined();
  });

  it("collapses runs of capitals when generating kebab-case names", () => {
    const names = listRefactorings().map((r) => r.name);
    expect(names).toContain("convert-comment-to-jsdoc");
    expect(names).not.toContain("convert-comment-to-j-s-doc");
  });

  it("resolves a refactoring whose original key contains a run of capitals", () => {
    expect(findRefactoring("convert-comment-to-jsdoc")?.command.key).toBe(
      "convertCommentToJSDoc"
    );
  });
});
