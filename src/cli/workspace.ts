import { minimatch } from "minimatch";
import { glob, readFile, stat } from "node:fs/promises";
import { join, sep } from "node:path";

export type WorkspaceOptions = {
  root: string;
  ignoredFolders: string[];
  ignoredPatterns: string[];
  maxFileLines: number;
  maxFileSizeKb: number;
  files?: string[];
};

export type WorkspaceFile = {
  absolutePath: string;
  relativePath: string;
  content: string;
};

const EXTENSIONS = ["js", "jsx", "ts", "tsx"];
const EXTENSION_PATTERN = `**/*.{${EXTENSIONS.join(",")}}`;

export async function scanWorkspace(
  opts: WorkspaceOptions
): Promise<WorkspaceFile[]> {
  const patterns =
    opts.files && opts.files.length > 0 ? opts.files : [EXTENSION_PATTERN];
  const results: WorkspaceFile[] = [];

  for (const pattern of patterns) {
    for await (const entry of glob(pattern, { cwd: opts.root })) {
      const relativePath = entry.split(sep).join("/");

      if (relativePath.endsWith(".d.ts")) continue;
      if (isInIgnoredFolder(relativePath, opts.ignoredFolders)) continue;
      if (matchesIgnoredPattern(relativePath, opts.ignoredPatterns)) continue;

      const absolutePath = join(opts.root, entry);
      const stats = await stat(absolutePath);
      if (stats.size > opts.maxFileSizeKb * 1024) continue;

      const content = await readFile(absolutePath, "utf-8");
      if (countLines(content) > opts.maxFileLines) continue;

      results.push({ absolutePath, relativePath, content });
    }
  }

  return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function isInIgnoredFolder(relativePath: string, folders: string[]): boolean {
  const segments = relativePath.split("/");
  return folders.some((folder) => segments.includes(folder));
}

function matchesIgnoredPattern(
  relativePath: string,
  patterns: string[]
): boolean {
  return patterns.some((pattern) => minimatch(relativePath, pattern));
}

function countLines(content: string): number {
  if (content === "") return 0;
  let count = 1;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "\n") count++;
  }
  return count;
}
