import { createPatch } from "diff";

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
