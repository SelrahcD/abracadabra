import { Position } from "../editor/position";
import { Selection } from "../editor/selection";
import { UserResponse } from "../refactorings";

export type StateTokenPayload = {
  code: string;
  selection: Selection;
  responses: UserResponse[];
};

const VERSION_PREFIX = "v1.";

export function encodeStateToken(payload: StateTokenPayload): string {
  const wire = {
    code: payload.code,
    selection: [
      [payload.selection.start.line, payload.selection.start.character],
      [payload.selection.end.line, payload.selection.end.character]
    ],
    responses: payload.responses
  };
  const json = JSON.stringify(wire);
  return VERSION_PREFIX + Buffer.from(json, "utf-8").toString("base64");
}

export function decodeStateToken(token: string): StateTokenPayload {
  if (!token.startsWith(VERSION_PREFIX)) {
    throw new Error(`Unsupported state-token version: ${token.slice(0, 5)}`);
  }
  const json = Buffer.from(
    token.slice(VERSION_PREFIX.length),
    "base64"
  ).toString("utf-8");
  const wire = JSON.parse(json);
  return {
    code: wire.code,
    selection: Selection.fromPositions(
      new Position(wire.selection[0][0], wire.selection[0][1]),
      new Position(wire.selection[1][0], wire.selection[1][1])
    ),
    responses: wire.responses
  };
}
