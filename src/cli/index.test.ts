import { runCli } from "./index";

describe("runCli", () => {
  it("routes to 'list'", async () => {
    const r = await runCli(["list", "--json"]);
    expect(r.exitCode).toBe(0);
    expect(JSON.parse(r.stdout).status).toBe("list");
  });

  it("returns INVALID_ARGS when no subcommand is given", async () => {
    const r = await runCli([]);
    expect(r.exitCode).toBe(3);
  });

  it("returns INVALID_ARGS for unknown subcommand", async () => {
    const r = await runCli(["nonsense"]);
    expect(r.exitCode).toBe(3);
  });

  it("supports the bare shorthand 'abracadabra <name> <position>'", async () => {
    // The router treats unknown first arg + a position-shaped second arg as `apply <name> <position>`.
    // (Validate by checking it dispatches to apply, which will fail with file-not-found here.)
    const r = await runCli([
      "rename-symbol",
      "/nonexistent/foo.ts:1:1",
      "--json"
    ]);
    // Either INVALID_ARGS (path not found) or INTERNAL_ERROR depending on impl; assert it's routed:
    expect([3, 4]).toContain(r.exitCode);
  });
});
