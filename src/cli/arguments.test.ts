import { Selection } from "../editor/selection";
import { parsePosition } from "./arguments";

describe("parsePosition", () => {
  it("parses cursor position 'path:line:col' (1-indexed)", () => {
    expect(parsePosition("src/foo.ts:23:10")).toEqual({
      path: "src/foo.ts",
      selection: Selection.cursorAt(22, 9)
    });
  });

  it("parses range 'path:line:col-line:col'", () => {
    expect(parsePosition("src/foo.ts:5:1-10:20")).toEqual({
      path: "src/foo.ts",
      selection: new Selection([4, 0], [9, 19])
    });
  });

  it("supports absolute paths", () => {
    expect(parsePosition("/abs/path/foo.ts:1:1").path).toBe("/abs/path/foo.ts");
  });

  it("rejects missing line/col", () => {
    expect(() => parsePosition("src/foo.ts:23")).toThrow(/invalid position/i);
  });

  it("rejects zero or negative line/col", () => {
    expect(() => parsePosition("src/foo.ts:0:1")).toThrow(/must be >= 1/i);
    expect(() => parsePosition("src/foo.ts:1:0")).toThrow(/must be >= 1/i);
  });
});
