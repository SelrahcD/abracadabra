import { Code, Command, Result } from "../editor";
import { Position } from "../position";
import { Selection } from "../selection";
import { InMemoryEditor } from "./in-memory-editor";

export class CliEditor extends InMemoryEditor {
  private responseQueue: QueuedResponse[] = [];
  private lastErrorReason: string | undefined;

  constructor(code: Code = "", position: Position = new Position(0, 0)) {
    super(code, position);
  }

  async showError(reason: string, _details?: unknown): Promise<void> {
    this.lastErrorReason = reason;
  }

  get capturedError(): string | undefined {
    return this.lastErrorReason;
  }

  async askUserInput(defaultValue?: string): Promise<string | undefined> {
    const queued = this.shiftResponse("input");
    if (queued !== undefined) {
      return queued.value;
    }
    throw new NeedsInputError({
      id: "user-input",
      type: "input",
      default: defaultValue
    });
  }

  async askUserChoice<T>(
    choices: {
      value: T;
      label: string;
      description?: string;
      icon?: "file-code";
    }[],
    placeHolder?: string
  ): Promise<
    | { value: T; label: string; description?: string; icon?: "file-code" }
    | undefined
  > {
    const queued = this.shiftResponse("choice");
    if (queued !== undefined) {
      return queued.value as { value: T; label: string };
    }
    throw new NeedsInputError({
      id: "user-choice",
      type: "choice",
      choices: choices.map((c) => ({ label: c.label, value: c.value })),
      placeHolder
    });
  }

  async askForPositions(
    currentPositions: {
      label: string;
      value: { startAt: number; endAt: number; val?: string };
    }[]
  ): Promise<
    { label: string; value: { startAt: number; endAt: number; val?: string } }[]
  > {
    const queued = this.shiftResponse("positions");
    if (queued !== undefined) {
      return queued.value as {
        label: string;
        value: { startAt: number; endAt: number; val?: string };
      }[];
    }
    throw new NeedsInputError({
      id: "change-signature-positions",
      type: "positions",
      positions: currentPositions
    });
  }

  async delegate(_command?: Command, _selection?: Selection): Promise<Result> {
    return "not supported";
  }

  private shiftResponse<T extends QueuedResponse["type"]>(
    expectedType: T
  ): Extract<QueuedResponse, { type: T }> | undefined {
    const next = this.responseQueue[0];
    if (next?.type !== expectedType) return undefined;
    return this.responseQueue.shift() as Extract<QueuedResponse, { type: T }>;
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
