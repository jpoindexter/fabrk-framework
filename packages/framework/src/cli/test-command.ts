import path from "node:path";

export async function runTest(root: string, rawArgs: string[], version: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`\n  fabrk test v${version}\n`);

  try {
    const { execFileSync } = await import("node:child_process");

    // eslint-disable-next-line no-console
    console.log("  Running vitest...\n");

    execFileSync(process.execPath, [
      path.join(root, "node_modules/.bin/vitest"),
      "run",
      ...rawArgs,
    ], {
      cwd: root,
      stdio: "inherit",
    });
  } catch (err) {
    if (err && typeof err === "object" && "status" in err) {
      process.exit((err as { status: number }).status);
    }
    console.error("  Failed to run tests. Is vitest installed?");
    process.exit(1);
  }
}
