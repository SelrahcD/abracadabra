import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runApplyCommand } from "./apply";

describe("apply command — single-file happy path", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "abracadabra-apply-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("applies flip-if-else and writes the file in place", async () => {
    const file = join(dir, "foo.ts");
    writeFileSync(file, `if (a) {\n  b;\n} else {\n  c;\n}\n`);

    const result = await runApplyCommand({
      name: "flip-if-else",
      position: `${file}:1:1`,
      json: true
    });

    expect(result.exitCode).toBe(0);
    const updated = readFileSync(file, "utf-8");
    expect(updated).toContain("if (!a)");
    expect(JSON.parse(result.stdout).status).toBe("ok");
  });
});

describe("apply --dry-run", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "abracadabra-apply-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("prints a diff and leaves the file untouched", async () => {
    const file = join(dir, "foo.ts");
    const original = `if (a) {\n  b;\n} else {\n  c;\n}\n`;
    writeFileSync(file, original);

    const result = await runApplyCommand({
      name: "flip-if-else",
      position: `${file}:1:1`,
      json: false,
      dryRun: true
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(`--- ${file}`);
    expect(result.stdout).toContain(`+++ ${file}`);
    expect(readFileSync(file, "utf-8")).toBe(original);
  });
});

describe("apply --stdout", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "abracadabra-apply-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("prints the new code and leaves the file untouched", async () => {
    const file = join(dir, "foo.ts");
    const original = `if (a) {\n  b;\n} else {\n  c;\n}\n`;
    writeFileSync(file, original);

    const result = await runApplyCommand({
      name: "flip-if-else",
      position: `${file}:1:1`,
      json: false,
      stdout: true
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("if (!a)");
    expect(readFileSync(file, "utf-8")).toBe(original);
  });
});

describe("apply errors", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "abracadabra-apply-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns NOT_APPLICABLE when the refactoring does not match", async () => {
    const file = join(dir, "foo.ts");
    writeFileSync(file, `const x = 1;\n`);

    const result = await runApplyCommand({
      name: "flip-if-else",
      position: `${file}:1:1`,
      json: true
    });

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout).status).toBe("not-applicable");
  });

  it("returns INVALID_ARGS for unknown refactoring", async () => {
    const file = join(dir, "foo.ts");
    writeFileSync(file, "x");

    const result = await runApplyCommand({
      name: "nope",
      position: `${file}:1:1`,
      json: true
    });

    expect(result.exitCode).toBe(3);
  });
});
