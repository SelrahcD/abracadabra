import { EXIT_CODES, formatJsonResult } from "../output";
import { listRefactorings } from "../registry";

export type ListOptions = { json: boolean };

export type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr?: string;
};

export function runListCommand(opts: ListOptions): CommandResult {
  const refactorings = listRefactorings();
  if (opts.json) {
    return {
      exitCode: EXIT_CODES.OK,
      stdout: formatJsonResult({
        status: "list",
        refactorings: refactorings.map((r) => ({
          name: r.name,
          title: r.title
        }))
      })
    };
  }
  const lines = refactorings.map((r) => `${r.name.padEnd(40)} ${r.title}`);
  return { exitCode: EXIT_CODES.OK, stdout: lines.join("\n") };
}
