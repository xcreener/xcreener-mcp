import { defineConfig, type Options } from "tsup";

export default defineConfig((options: Options) => ({
  entryPoints: ["src/index.ts"],
  clean: true,
  format: ["esm"],
  platform: "node",
  target: "node18",
  // Bundle every dependency into the single output file: this same file gets
  // copied verbatim into the .mcpb bundle's server/ directory, which must be
  // self-contained (no node_modules) — see design.md decision 5.
  noExternal: [/.*/],
  ...options,
}));
