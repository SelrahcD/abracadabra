import { Position } from "../editor/position";
import { Selection } from "../editor/selection";
import {
  decodeStateToken,
  encodeStateToken,
  StateTokenPayload
} from "./state-token";

describe("state-token", () => {
  it("round-trips a fresh state with no responses", () => {
    const payload: StateTokenPayload = {
      code: "const x = 1;",
      selection: Selection.cursorAtPosition(new Position(0, 6)),
      responses: []
    };

    const decoded = decodeStateToken(encodeStateToken(payload));

    expect(decoded.code).toBe("const x = 1;");
    expect(decoded.selection).toEqual(
      Selection.cursorAtPosition(new Position(0, 6))
    );
    expect(decoded.responses).toEqual([]);
  });

  it("round-trips a state with mixed responses", () => {
    const payload: StateTokenPayload = {
      code: "const x = 1;",
      selection: Selection.cursorAtPosition(new Position(0, 6)),
      responses: [
        {
          id: "user-choice",
          type: "choice",
          value: { label: "A", value: "a" }
        },
        { id: "user-input", type: "input", value: "newName" }
      ]
    };

    const decoded = decodeStateToken(encodeStateToken(payload));

    expect(decoded).toEqual(payload);
  });

  it("emits a 'v1.' version prefix", () => {
    const token = encodeStateToken({
      code: "",
      selection: Selection.cursorAtPosition(new Position(0, 0)),
      responses: []
    });
    expect(token.startsWith("v1.")).toBe(true);
  });

  it("rejects an unknown version prefix", () => {
    expect(() => decodeStateToken("v2.abc")).toThrow(
      /unsupported state-token version/i
    );
  });

  it("rejects malformed base64 content", () => {
    expect(() => decodeStateToken("v1.not-base64-data!!!")).toThrow();
  });
});
