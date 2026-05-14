import { readFileSync } from "node:fs";
import { parse, traverseAST } from "../../ast";
import { RefactoringWithActionProviderConfig } from "../../refactorings";
import { parsePosition } from "../arguments";
import { EXIT_CODES, formatJsonResult } from "../output";
import { findRefactoring, listRefactorings } from "../registry";
import { CommandResult } from "./list";

export type ApplicableOptions = { position: string; json: boolean };

export function runApplicableCommand(opts: ApplicableOptions): CommandResult {
  let position;
  try {
    position = parsePosition(opts.position);
  } catch (err) {
    return {
      exitCode: EXIT_CODES.INVALID_ARGS,
      stdout: "",
      stderr: (err as Error).message
    };
  }

  const code = readFileSync(position.path, "utf-8");
  const ast = parse(code);

  const matches: {
    name: string;
    title: string;
    message: string;
    range: string;
  }[] = [];

  for (const entry of listRefactorings()) {
    const cfg = findRefactoring(entry.name);
    if (!cfg || !hasActionProvider(cfg)) continue;
    const ap = cfg.actionProvider;

    traverseAST(
      ast,
      ap.createVisitor(position.selection, (path) => {
        if (!path.node.loc) return;
        const loc = path.node.loc;
        const range = `${position.path}:${loc.start.line}:${loc.start.column + 1}-${loc.end.line}:${loc.end.column + 1}`;
        matches.push({
          name: entry.name,
          title: entry.title,
          message: ap.updateMessage ? ap.updateMessage(path) : ap.message,
          range
        });
      })
    );
  }

  return {
    exitCode: EXIT_CODES.OK,
    stdout: opts.json
      ? formatJsonResult({ status: "applicable", matches })
      : matches.map((m) => `${m.name.padEnd(40)} ${m.message}`).join("\n")
  };
}

function hasActionProvider(
  cfg: unknown
): cfg is RefactoringWithActionProviderConfig {
  return typeof cfg === "object" && cfg !== null && "actionProvider" in cfg;
}
