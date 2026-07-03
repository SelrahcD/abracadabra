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

describe("askUserChoice", () => {
  const choices = [
    { label: "Variable", value: "variable" },
    { label: "Constant", value: "constant" }
  ];

  it("throws NeedsInputError when no response is queued", async () => {
    const editor = new CliEditor("");

    await expect(
      editor.askUserChoice(choices, "Pick one")
    ).rejects.toMatchObject({
      name: "NeedsInputError",
      prompt: {
        id: "user-choice",
        type: "choice",
        choices,
        placeHolder: "Pick one"
      }
    });
  });

  it("returns the queued choice when available", async () => {
    const editor = new CliEditor("");
    editor.replyWith([{ type: "choice", value: choices[1] }]);

    await expect(editor.askUserChoice(choices)).resolves.toEqual(choices[1]);
  });
});

describe("askForPositions", () => {
  const positions = [
    { label: "a", value: { startAt: 0, endAt: 0 } },
    { label: "b", value: { startAt: 1, endAt: 1 } }
  ];

  it("throws NeedsInputError when no response is queued", async () => {
    const editor = new CliEditor("");

    await expect(editor.askForPositions(positions)).rejects.toMatchObject({
      name: "NeedsInputError",
      prompt: { id: "change-signature-positions", type: "positions", positions }
    });
  });

  it("returns the queued positions when available", async () => {
    const editor = new CliEditor("");
    const reordered = [positions[1], positions[0]];
    editor.replyWith([{ type: "positions", value: reordered }]);

    await expect(editor.askForPositions(positions)).resolves.toEqual(reordered);
  });
});

describe("delegate", () => {
  it("returns 'not supported' for rename symbol", async () => {
    const editor = new CliEditor("");
    await expect(editor.delegate("rename symbol")).resolves.toBe(
      "not supported"
    );
  });

  it("returns 'not supported' for extract function", async () => {
    const editor = new CliEditor("");
    await expect(editor.delegate("extract function")).resolves.toBe(
      "not supported"
    );
  });
});
