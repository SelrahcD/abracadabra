import {
  EXIT_CODES,
  formatJsonResult,
  formatUnifiedDiff,
  JsonResult
} from "./output";

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

describe("EXIT_CODES", () => {
  it("defines a stable map of named exit codes", () => {
    expect(EXIT_CODES).toEqual({
      OK: 0,
      NOT_APPLICABLE: 1,
      NEEDS_INPUT: 2,
      INVALID_ARGS: 3,
      INTERNAL_ERROR: 4
    });
  });
});

describe("formatJsonResult", () => {
  it("formats an 'ok' result", () => {
    const result: JsonResult = {
      status: "ok",
      changes: [{ path: "src/foo.ts", diff: "..." }]
    };
    const formatted = JSON.parse(formatJsonResult(result));
    expect(formatted).toEqual(result);
  });

  it("formats a 'needs-input' result with a state-token", () => {
    const result: JsonResult = {
      status: "needs-input",
      prompts: [{ id: "user-input", type: "input", default: "foo" }],
      stateToken: "v1.abc"
    };
    expect(JSON.parse(formatJsonResult(result))).toEqual(result);
  });

  it("formats a 'not-applicable' result", () => {
    const result: JsonResult = { status: "not-applicable", reason: "no match" };
    expect(JSON.parse(formatJsonResult(result))).toEqual(result);
  });
});
