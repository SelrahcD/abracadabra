import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decodeStateToken } from "../state-token";
import { runApplyCommand } from "./apply";
 
type AnyResponse = any;

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

describe("apply two-pass dialogue", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "abracadabra-apply-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("first turn returns NEEDS_INPUT with a state-token; second turn applies", async () => {
    const file = join(dir, "foo.ts");
    writeFileSync(file, `const oldName = 1;\n`);

    const turn1 = await runApplyCommand({
      name: "rename-symbol",
      position: `${file}:1:7`,
      json: true
    });

    expect(turn1.exitCode).toBe(2);
    const parsed1 = JSON.parse(turn1.stdout);
    expect(parsed1.status).toBe("needs-input");
    expect(parsed1.prompts[0].type).toBe("input");
    expect(parsed1.stateToken.startsWith("v1.")).toBe(true);

    const decoded = decodeStateToken(parsed1.stateToken);
    expect(decoded.code).toContain("oldName");

    const turn2 = await runApplyCommand({
      name: "rename-symbol",
      position: `${file}:1:7`,
      json: true,

      responses: [{ id: "user-input", type: "input", value: "newName" } as any]
    });

    expect(turn2.exitCode).toBe(0);
    expect(readFileSync(file, "utf-8")).toContain("newName");
    expect(readFileSync(file, "utf-8")).not.toContain("oldName");
  });
});

describe("apply multi-file", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "abracadabra-apply-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("rejects without --write", async () => {
    const file = join(dir, "util.ts");
    writeFileSync(file, `export function send(a, b) { return a + b; }\n`);

    const result = await runApplyCommand({
      name: "change-signature",
      position: `${file}:1:17`,
      json: true
    });

    expect(result.exitCode).toBe(3);
    expect(result.stderr ?? result.stdout).toMatch(/--write/);
  });

  it("with --write applies edits across multiple files", async () => {
    const util = join(dir, "util.ts");
    const caller = join(dir, "caller.ts");
    writeFileSync(util, `export function send(a, b) { return a + b; }\n`);
    writeFileSync(caller, `import { send } from "./util";\nsend(1, 2);\n`);

    const result = await runApplyCommand({
      name: "change-signature",
      position: `${util}:1:17`,
      json: true,
      write: true,
      workspaceRoot: dir,
      responses: [
        {
          id: "change-signature-positions",
          type: "new positions",
          positions: [
            { label: "b", value: { startAt: 1, endAt: 0 } },
            { label: "a", value: { startAt: 0, endAt: 1 } }
          ],
          references: []
        } as AnyResponse
      ]
    });

    expect(result.exitCode).toBe(0);
    expect(readFileSync(util, "utf-8")).toMatch(/function send\(b, a\)/);
    expect(readFileSync(caller, "utf-8")).toMatch(/send\(2, 1\)/);
  });
});
