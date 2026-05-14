import { Position } from "../position";
import { Selection } from "../selection";
import { CliEditor } from "./cli-editor";

describe("CliEditor", () => {
  it("constructs with code and position", () => {
    const editor = new CliEditor("const x = 1;", new Position(0, 6));
    expect(editor.code).toBe("const x = 1;");
    expect(editor.selection).toEqual(Selection.cursorAt(0, 6));
  });
});
