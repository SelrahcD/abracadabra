import { createPatch } from "diff";
import { NeedsInputPrompt } from "../editor/adapters/cli-editor";

export function formatUnifiedDiff(
  path: string,
  oldContent: string,
  newContent: string
): string {
  if (oldContent === newContent) return "";
  return createPatch(path, oldContent, newContent, undefined, undefined, {
    context: 3
  });
}

export const EXIT_CODES = {
  OK: 0,
  NOT_APPLICABLE: 1,
  NEEDS_INPUT: 2,
  INVALID_ARGS: 3,
  INTERNAL_ERROR: 4
} as const;

export type JsonResult =
  | { status: "ok"; changes: { path: string; diff: string }[] }
  | { status: "not-applicable"; reason: string }
  | { status: "needs-input"; prompts: NeedsInputPrompt[]; stateToken: string }
  | { status: "error"; reason: string; details?: unknown }
  | { status: "list"; refactorings: { name: string; title: string }[] }
  | {
      status: "applicable";
      matches: {
        name: string;
        title: string;
        message: string;
        range: string;
      }[];
    };

export function formatJsonResult(result: JsonResult): string {
  return JSON.stringify(result);
}
