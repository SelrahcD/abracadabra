import { Position } from "../position";
import { Selection } from "../selection";
import { CliEditor, NeedsInputError } from "./cli-editor";

describe("CliEditor", () => {
  it("constructs with code and position", () => {
    const editor = new CliEditor("const x = 1;", new Position(0, 6));
    expect(editor.code).toBe("const x = 1;");
    expect(editor.selection).toEqual(Selection.cursorAt(0, 6));
  });
});

describe("askUserInput", () => {
  it("throws NeedsInputError when no response is queued", async () => {
    const editor = new CliEditor("");

    await expect(editor.askUserInput("default-value")).rejects.toMatchObject({
      name: "NeedsInputError",
      prompt: { id: "user-input", type: "input", default: "default-value" }
    });
  });

  it("returns the queued response when available", async () => {
    const editor = new CliEditor("");
    editor.replyWith([{ type: "input", value: "queued-value" }]);

    await expect(editor.askUserInput("default-value")).resolves.toBe(
      "queued-value"
    );
  });

  it("consumes one queued response per call", async () => {
    const editor = new CliEditor("");
    editor.replyWith([
      { type: "input", value: "first" },
      { type: "input", value: "second" }
    ]);

    await expect(editor.askUserInput()).resolves.toBe("first");
    await expect(editor.askUserInput()).resolves.toBe("second");
    await expect(editor.askUserInput()).rejects.toBeInstanceOf(NeedsInputError);
  });
});
