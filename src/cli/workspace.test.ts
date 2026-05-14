import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanWorkspace } from "./workspace";

describe("scanWorkspace", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "abracadabra-ws-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function write(rel: string, content: string) {
    const full = join(dir, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }

  it("includes js/jsx/ts/tsx files", async () => {
    write("a.ts", "1");
    write("b.js", "2");
    write("c.tsx", "3");
    write("d.jsx", "4");
    write("e.txt", "5");

    const files = await scanWorkspace({
      root: dir,
      ignoredFolders: [],
      ignoredPatterns: [],
      maxFileLines: 10000,
      maxFileSizeKb: 250
    });

    expect(files.map((f) => f.relativePath).sort()).toEqual([
      "a.ts",
      "b.js",
      "c.tsx",
      "d.jsx"
    ]);
  });

  it("excludes ignored folders", async () => {
    write("src/a.ts", "1");
    write("node_modules/b.ts", "2");

    const files = await scanWorkspace({
      root: dir,
      ignoredFolders: ["node_modules"],
      ignoredPatterns: [],
      maxFileLines: 10000,
      maxFileSizeKb: 250
    });

    expect(files.map((f) => f.relativePath)).toEqual(["src/a.ts"]);
  });

  it("excludes ignored patterns", async () => {
    write("src/a.ts", "1");
    write("dist/b.ts", "2");
    write("build/c.ts", "3");

    const files = await scanWorkspace({
      root: dir,
      ignoredFolders: [],
      ignoredPatterns: ["dist/*", "build/*"],
      maxFileLines: 10000,
      maxFileSizeKb: 250
    });

    expect(files.map((f) => f.relativePath)).toEqual(["src/a.ts"]);
  });

  it("skips .d.ts files", async () => {
    write("a.ts", "1");
    write("a.d.ts", "2");

    const files = await scanWorkspace({
      root: dir,
      ignoredFolders: [],
      ignoredPatterns: [],
      maxFileLines: 10000,
      maxFileSizeKb: 250
    });

    expect(files.map((f) => f.relativePath)).toEqual(["a.ts"]);
  });

  it("excludes files exceeding maxFileLines", async () => {
    write("small.ts", "x\n".repeat(5));
    write("big.ts", "x\n".repeat(20));

    const files = await scanWorkspace({
      root: dir,
      ignoredFolders: [],
      ignoredPatterns: [],
      maxFileLines: 10,
      maxFileSizeKb: 250
    });

    expect(files.map((f) => f.relativePath)).toEqual(["small.ts"]);
  });

  it("excludes files exceeding maxFileSizeKb", async () => {
    write("small.ts", "x".repeat(100));
    write("big.ts", "x".repeat(3000));

    const files = await scanWorkspace({
      root: dir,
      ignoredFolders: [],
      ignoredPatterns: [],
      maxFileLines: 10000,
      maxFileSizeKb: 1
    });

    expect(files.map((f) => f.relativePath)).toEqual(["small.ts"]);
  });

  it("loads the file contents", async () => {
    write("a.ts", "hello");

    const files = await scanWorkspace({
      root: dir,
      ignoredFolders: [],
      ignoredPatterns: [],
      maxFileLines: 10000,
      maxFileSizeKb: 250
    });

    expect(files[0].content).toBe("hello");
  });
});
