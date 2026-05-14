import { readFileSync, writeFileSync } from "node:fs";
import {
  CliEditor,
  NeedsInputError,
  QueuedResponse
} from "../../editor/adapters/cli-editor";
import { Selection } from "../../editor/selection";
import { executeRefactoring, UserResponse } from "../../refactorings";
import { parsePosition } from "../arguments";
import { EXIT_CODES, formatJsonResult, formatUnifiedDiff } from "../output";
import { findRefactoring } from "../registry";
import { encodeStateToken } from "../state-token";
import { CommandResult } from "./list";

export type ApplyOptions = {
  name: string;
  position: string;
  json: boolean;
  dryRun?: boolean;
  stdout?: boolean;
  write?: boolean;
  stateToken?: string;
  responses?: UserResponse[];
};

export async function runApplyCommand(
  opts: ApplyOptions
): Promise<CommandResult> {
  const cfg = findRefactoring(opts.name);
  if (!cfg) {
    return {
      exitCode: EXIT_CODES.INVALID_ARGS,
      stdout: opts.json
        ? formatJsonResult({
            status: "error",
            reason: `Unknown refactoring '${opts.name}'.`
          })
        : "",
      stderr: `Unknown refactoring '${opts.name}'.`
    };
  }

  let parsedPosition;
  try {
    parsedPosition = parsePosition(opts.position);
  } catch (err) {
    return {
      exitCode: EXIT_CODES.INVALID_ARGS,
      stdout: "",
      stderr: (err as Error).message
    };
  }

  const originalCode = readFileSync(parsedPosition.path, "utf-8");
  const codeWithMarkers = withSelectionMarkers(
    originalCode,
    parsedPosition.selection
  );
  const editor = new CliEditor(codeWithMarkers, parsedPosition.selection.start);

  if (opts.responses && opts.responses.length > 0) {
    editor.replyWith(opts.responses.map(toQueued));
  }

  try {
    await executeRefactoring(cfg.command.operation, editor);
  } catch (err) {
    if (err instanceof NeedsInputError) {
      const token = encodeStateToken({
        code: originalCode,
        selection: parsedPosition.selection,
        responses: opts.responses ?? []
      });
      return {
        exitCode: EXIT_CODES.NEEDS_INPUT,
        stdout: formatJsonResult({
          status: "needs-input",
          prompts: [err.prompt],
          stateToken: token
        })
      };
    }
    throw err;
  }

  const newCode = editor.code;
  if (newCode === originalCode) {
    return {
      exitCode: EXIT_CODES.NOT_APPLICABLE,
      stdout: formatJsonResult({
        status: "not-applicable",
        reason: "no change"
      })
    };
  }

  const diff = formatUnifiedDiff(parsedPosition.path, originalCode, newCode);

  if (opts.dryRun) {
    return {
      exitCode: EXIT_CODES.OK,
      stdout: opts.json
        ? formatJsonResult({
            status: "ok",
            changes: [{ path: parsedPosition.path, diff }]
          })
        : diff
    };
  }

  if (opts.stdout) {
    return {
      exitCode: EXIT_CODES.OK,
      stdout: newCode
    };
  }

  writeFileSync(parsedPosition.path, newCode);
  return {
    exitCode: EXIT_CODES.OK,
    stdout: formatJsonResult({
      status: "ok",
      changes: [{ path: parsedPosition.path, diff }]
    })
  };
}

function toQueued(r: UserResponse): QueuedResponse {
  switch (r.type) {
    case "input":
      return { type: "input", value: r.value };
    case "choice":
      return { type: "choice", value: r.value };
    case "new positions":
      return { type: "positions", value: r.positions };
  }
}

function withSelectionMarkers(code: string, selection: Selection): string {
  if (selection.isEmpty) {
    return insertAt(code, selection.start, "[cursor]");
  }
  // Insert [end] before [start] so [start] insertion isn't shifted by [end]'s bytes.
  return insertAt(
    insertAt(code, selection.end, "[end]"),
    selection.start,
    "[start]"
  );
}

function insertAt(
  code: string,
  pos: { line: number; character: number },
  marker: string
): string {
  const lines = code.split("\n");
  const line = lines[pos.line];
  lines[pos.line] =
    line.slice(0, pos.character) + marker + line.slice(pos.character);
  return lines.join("\n");
}
