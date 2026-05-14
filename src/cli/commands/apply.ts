import { readFileSync, writeFileSync } from "node:fs";
import {
  CliEditor,
  NeedsInputError,
  QueuedResponse
} from "../../editor/adapters/cli-editor";
import { RelativePath } from "../../editor/path";
import { Selection } from "../../editor/selection";
import { executeRefactoring, UserResponse } from "../../refactorings";
import { parsePosition } from "../arguments";
import { EXIT_CODES, formatJsonResult, formatUnifiedDiff } from "../output";
import { findRefactoring } from "../registry";
import { encodeStateToken } from "../state-token";
import { scanWorkspace } from "../workspace";
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
  workspaceRoot?: string;
  ignoredFolders?: string[];
  ignoredPatterns?: string[];
  maxFileLines?: number;
  maxFileSizeKb?: number;
  files?: string[];
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

  if (cfg.crossFile && !opts.write && !opts.dryRun) {
    const msg = `'${opts.name}' modifies multiple files. Pass --write to apply, or --dry-run to preview.`;
    return {
      exitCode: EXIT_CODES.INVALID_ARGS,
      stdout: opts.json
        ? formatJsonResult({ status: "error", reason: msg })
        : "",
      stderr: msg
    };
  }

  if (cfg.crossFile && opts.stdout) {
    const msg = `'${opts.name}' modifies multiple files; --stdout is unsupported.`;
    return {
      exitCode: EXIT_CODES.INVALID_ARGS,
      stdout: opts.json
        ? formatJsonResult({ status: "error", reason: msg })
        : "",
      stderr: msg
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

  let originalCode: string;
  try {
    originalCode = readFileSync(parsedPosition.path, "utf-8");
  } catch (err) {
    return {
      exitCode: EXIT_CODES.INVALID_ARGS,
      stdout: opts.json
        ? formatJsonResult({
            status: "error",
            reason: `Cannot read ${parsedPosition.path}: ${(err as Error).message}`
          })
        : "",
      stderr: `Cannot read ${parsedPosition.path}: ${(err as Error).message}`
    };
  }
  const codeWithMarkers = withSelectionMarkers(
    originalCode,
    parsedPosition.selection
  );
  const editor = new CliEditor(codeWithMarkers, parsedPosition.selection.start);

  if (opts.responses && opts.responses.length > 0) {
    editor.replyWith(opts.responses.map(toQueued));
  }

  const workspaceFiles: {
    absolutePath: string;
    relativePath: string;
    content: string;
    pathKey: RelativePath;
  }[] = [];
  if (cfg.crossFile) {
    const root = opts.workspaceRoot ?? process.cwd();
    const scanned = await scanWorkspace({
      root,
      ignoredFolders: opts.ignoredFolders ?? ["node_modules"],
      ignoredPatterns: opts.ignoredPatterns ?? ["dist/*", "build/*"],
      maxFileLines: opts.maxFileLines ?? 10000,
      maxFileSizeKb: opts.maxFileSizeKb ?? 250,
      files: opts.files
    });

    for (const f of scanned) {
      const pathKey = new RelativePath(f.relativePath);
      await editor.writeIn(pathKey, f.content);
      workspaceFiles.push({ ...f, pathKey });
    }
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

  const updates: { path: string; oldContent: string; newContent: string }[] =
    [];

  if (cfg.crossFile) {
    for (const f of workspaceFiles) {
      const newContent = await editor.codeOf(f.pathKey);
      if (newContent !== f.content) {
        updates.push({
          path: f.absolutePath,
          oldContent: f.content,
          newContent
        });
      }
    }
  } else if (editor.code !== originalCode) {
    updates.push({
      path: parsedPosition.path,
      oldContent: originalCode,
      newContent: editor.code
    });
  }

  if (updates.length === 0) {
    return {
      exitCode: EXIT_CODES.NOT_APPLICABLE,
      stdout: formatJsonResult({
        status: "not-applicable",
        reason: editor.capturedError ?? "no change"
      })
    };
  }

  const changes = updates.map((u) => ({
    path: u.path,
    diff: formatUnifiedDiff(u.path, u.oldContent, u.newContent)
  }));

  if (opts.dryRun) {
    return {
      exitCode: EXIT_CODES.OK,
      stdout: opts.json
        ? formatJsonResult({ status: "ok", changes })
        : changes.map((c) => `=== ${c.path} ===\n${c.diff}`).join("\n\n")
    };
  }

  if (opts.stdout) {
    return {
      exitCode: EXIT_CODES.OK,
      stdout: editor.code
    };
  }

  for (const u of updates) {
    writeFileSync(u.path, u.newContent);
  }

  return {
    exitCode: EXIT_CODES.OK,
    stdout: formatJsonResult({ status: "ok", changes })
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
    default: {
      const _exhaustive: never = r;
      throw new Error(`Unknown response type: ${JSON.stringify(_exhaustive)}`);
    }
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
