import { formatUnifiedDiff } from "./output";

describe("formatUnifiedDiff", () => {
  it("produces a unified diff with file header", () => {
    const diff = formatUnifiedDiff(
      "foo.ts",
      "const x = 1;\n",
      "const y = 1;\n"
    );

    expect(diff).toContain("--- foo.ts");
    expect(diff).toContain("+++ foo.ts");
    expect(diff).toContain("-const x = 1;");
    expect(diff).toContain("+const y = 1;");
  });

  it("returns an empty string when content is unchanged", () => {
    expect(formatUnifiedDiff("foo.ts", "abc", "abc")).toBe("");
  });
});
