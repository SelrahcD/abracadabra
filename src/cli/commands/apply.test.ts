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
