import { Code } from "../editor";
import { Position } from "../position";
import { InMemoryEditor } from "./in-memory-editor";

export class CliEditor extends InMemoryEditor {
  constructor(code: Code = "", position: Position = new Position(0, 0)) {
    super(code, position);
  }
}

export type NeedsInputPrompt =
  | { id: string; type: "input"; default?: string }
  | {
      id: string;
      type: "choice";
      choices: { label: string; value: unknown }[];
      placeHolder?: string;
    }
  | {
      id: string;
      type: "positions";
      positions: { label: string; value: unknown }[];
    };

export class NeedsInputError extends Error {
  constructor(public readonly prompt: NeedsInputPrompt) {
    super(`Needs input: ${prompt.id}`);
    this.name = "NeedsInputError";
  }
}
