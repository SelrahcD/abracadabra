/* eslint-disable @typescript-eslint/no-var-requires */
// @ts-check

const fs = require("fs/promises");
const esbuild = require("esbuild");
const plugin = require("node-stdlib-browser/helpers/esbuild/plugin");
const stdLibBrowser = require("node-stdlib-browser");

const production = process.argv.includes("--production");

/**
 * @type {esbuild.BuildOptions}
 */
const commonOptions = {
  format: "cjs",
  bundle: true,
  minify: production,
  sourcemap: !production,
  metafile: !production,
  loader: { ".html": "text" },
  external: ["vscode"]
};

/**
 * @type {esbuild.BuildOptions[]}
 */
const options = [
  {
    ...commonOptions,
    entryPoints: ["./src/extension.ts"],
    outfile: "out/extension.js",
    platform: "node"
  },
  {
    ...commonOptions,
    entryPoints: ["./src/extension.ts"],
    outfile: "out/extension-browser.js",
    platform: "browser",
    inject: [require.resolve("node-stdlib-browser/helpers/esbuild/shim")],
    define: {
      assert: "assert",
      path: "path",
      process: "process",
      util: "util",
      Buffer: "Buffer"
    },
    plugins: [plugin(stdLibBrowser)]
  },
  {
    ...commonOptions,
    entryPoints: ["./src/cli/index.ts"],
    outfile: "out/cli/index.js",
    platform: "node",
    banner: { js: "#!/usr/bin/env node" }
  }
];

const targetFlag = (option) => option.outfile.includes("/cli/") ? "cli" : option.platform;

options
  .filter((option) => process.argv.includes(`--${targetFlag(option)}`))
  .forEach(async (option) => {
    const result = await esbuild.build(option);
    if (option.outfile.includes("/cli/")) {
      await fs.chmod(option.outfile, 0o755);
    }
    if (production) return;
    await fs.writeFile(
      `out/meta-${targetFlag(option)}.json`,
      JSON.stringify(result.metafile)
    );
  });
