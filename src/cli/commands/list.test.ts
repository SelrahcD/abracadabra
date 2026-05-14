import { runListCommand } from "./list";

describe("list command", () => {
  it("returns an 'list' status with every refactoring (JSON mode)", () => {
    const result = runListCommand({ json: true });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.status).toBe("list");
    expect(parsed.refactorings.length).toBeGreaterThan(30);
    expect(parsed.refactorings[0]).toHaveProperty("name");
    expect(parsed.refactorings[0]).toHaveProperty("title");
  });

  it("returns a human-readable list when json is false", () => {
    const result = runListCommand({ json: false });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("rename-symbol");
    expect(result.stdout).toContain("Rename Symbol");
  });
});
