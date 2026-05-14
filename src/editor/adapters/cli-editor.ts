import { Code } from "../editor";
import { Position } from "../position";
import { InMemoryEditor } from "./in-memory-editor";

export class CliEditor extends InMemoryEditor {
  private responseQueue: QueuedResponse[] = [];

  constructor(code: Code = "", position: Position = new Position(0, 0)) {
    super(code, position);
  }

  async askUserInput(defaultValue?: string): Promise<string | undefined> {
    const queued = this.shiftResponse("input");
    if (queued !== undefined) {
      return queued.value as string;
    }
    throw new NeedsInputError({
      id: "user-input",
      type: "input",
      default: defaultValue
    });
  }

  private shiftResponse(
    expectedType: "input" | "choice" | "positions"
  ): QueuedResponse | undefined {
    const next = this.responseQueue[0];
    if (next?.type !== expectedType) return undefined;
    return this.responseQueue.shift();
  }

  replyWith(responses: QueuedResponse[]): void {
    this.responseQueue.push(...responses);
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

export type QueuedResponse =
  | { type: "input"; value: string }
  | { type: "choice"; value: { label: string; value: unknown } }
  | { type: "positions"; value: { label: string; value: unknown }[] };
