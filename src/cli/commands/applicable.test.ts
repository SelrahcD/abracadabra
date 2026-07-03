import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runApplicableCommand } from "./applicable";

describe("applicable command", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "abracadabra-applicable-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function write(rel: string, content: string): string {
    const path = join(dir, rel);
    writeFileSync(path, content);
    return path;
  }

  it("returns matches at a position", () => {
    const file = write("foo.ts", "if (a) { b; } else { c; }\n");

    const result = runApplicableCommand({
      position: `${file}:1:1`,
      json: true
    });

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.status).toBe("applicable");
    expect(parsed.matches.length).toBeGreaterThan(0);
    expect(
      parsed.matches.some((m: { name: string }) => m.name === "flip-if-else")
    ).toBe(true);
  });

  it("returns an empty match list when nothing applies", () => {
    const file = write("foo.ts", "// just a comment\n");

    const result = runApplicableCommand({
      position: `${file}:1:1`,
      json: true
    });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).matches).toEqual([]);
  });

  it("fails with INVALID_ARGS when position is malformed", () => {
    const result = runApplicableCommand({ position: "bad", json: true });
    expect(result.exitCode).toBe(3);
  });
});
