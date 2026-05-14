import { parseArgs } from "node:util";
import { runApplicableCommand } from "./commands/applicable";
import { ApplyOptions, runApplyCommand } from "./commands/apply";
import { CommandResult, runListCommand } from "./commands/list";
import { EXIT_CODES } from "./output";
import { findRefactoring } from "./registry";
import { decodeStateToken } from "./state-token";

const POSITION_PATTERN = /^.+:\d+:\d+(-\d+:\d+)?$/;

export async function runCli(argv: string[]): Promise<CommandResult> {
  try {
    if (argv.length === 0) {
      return {
        exitCode: EXIT_CODES.INVALID_ARGS,
        stdout: "",
        stderr:
          "Usage: abracadabra <command> [...args]\n  Commands: list, applicable, apply"
      };
    }

    const [first, ...rest] = argv;

    if (first === "list") return runListCommand(parseListFlags(rest));
    if (first === "applicable")
      return runApplicableCommand(parseApplicableFlags(rest));
    if (first === "apply") return await runApplyCommand(parseApplyFlags(rest));

    // Shorthand: abracadabra <name> <position>
    if (
      findRefactoring(first) &&
      rest.length > 0 &&
      POSITION_PATTERN.test(rest[0])
    ) {
      return await runApplyCommand(parseApplyFlags([first, ...rest]));
    }

    return {
      exitCode: EXIT_CODES.INVALID_ARGS,
      stdout: "",
      stderr: `Unknown command '${first}'.`
    };
  } catch (err) {
    const message =
      err instanceof Error ? (err.stack ?? err.message) : String(err);
    return {
      exitCode: EXIT_CODES.INTERNAL_ERROR,
      stdout: "",
      stderr: message
    };
  }
}

function parseListFlags(args: string[]): { json: boolean } {
  const { values } = parseArgs({
    args,
    options: { json: { type: "boolean", default: false } },
    strict: false
  });
  return { json: values.json as boolean };
}

function parseApplicableFlags(args: string[]): {
  position: string;
  json: boolean;
} {
  const { values, positionals } = parseArgs({
    args,
    options: { json: { type: "boolean", default: false } },
    allowPositionals: true,
    strict: false
  });
  return { position: positionals[0] ?? "", json: values.json as boolean };
}

function parseApplyFlags(args: string[]): ApplyOptions {
  const { values, positionals } = parseArgs({
    args,
    options: {
      json: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      stdout: { type: "boolean", default: false },
      write: { type: "boolean", default: false },
      input: { type: "string" },
      responses: { type: "string" },
      "state-token": { type: "string" },
      workspace: { type: "string" },
      "ignored-folders": { type: "string", multiple: true },
      "ignored-patterns": { type: "string", multiple: true },
      "max-file-lines": { type: "string" },
      "max-file-size-kb": { type: "string" }
    },
    allowPositionals: true,
    strict: false
  });

   
  let responses: any[] = [];
  if (values.responses) responses = JSON.parse(values.responses as string);
  if (values.input)
    responses.push({ id: "user-input", type: "input", value: values.input });

  if (values["state-token"]) {
    const decoded = decodeStateToken(values["state-token"] as string);
    responses = [...decoded.responses, ...responses];
  }

  return {
    name: positionals[0] ?? "",
    position: positionals[1] ?? "",
    json: values.json as boolean,
    dryRun: values["dry-run"] as boolean,
    stdout: values.stdout as boolean,
    write: values.write as boolean,
    responses,
    workspaceRoot: values.workspace as string | undefined,
    ignoredFolders: values["ignored-folders"] as string[] | undefined,
    ignoredPatterns: values["ignored-patterns"] as string[] | undefined,
    maxFileLines: values["max-file-lines"]
      ? parseInt(values["max-file-lines"] as string, 10)
      : undefined,
    maxFileSizeKb: values["max-file-size-kb"]
      ? parseInt(values["max-file-size-kb"] as string, 10)
      : undefined
  };
}

// Bin entry — when run as a script:
if (typeof require !== "undefined" && require.main === module) {
  runCli(process.argv.slice(2))
    .then((result) => {
      if (result.stdout) process.stdout.write(result.stdout + "\n");
      if (result.stderr) process.stderr.write(result.stderr + "\n");
      process.exit(result.exitCode);
    })
    .catch((err) => {
      process.stderr.write(`${err.stack ?? err.message}\n`);
      process.exit(EXIT_CODES.INTERNAL_ERROR);
    });
}
