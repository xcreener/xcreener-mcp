import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const stagingDir = path.join(packageRoot, "dist-mcpb", "bundle");
const outputFile = path.join(packageRoot, "dist-mcpb", "xcreener.mcpb");
const builtServer = path.join(packageRoot, "dist", "index.js");

rmSync(path.join(packageRoot, "dist-mcpb"), { recursive: true, force: true });
mkdirSync(path.join(stagingDir, "server"), { recursive: true });

// The bundled manifest takes its version from package.json rather than being
// copied verbatim. Kept in sync by hand, the two drifted: every release up to
// and including v0.2.0 shipped a manifest still declaring 0.1.0, which is the
// version Claude Desktop shows and checks for updates against.
const pkg = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8"));
const manifest = JSON.parse(
  readFileSync(path.join(packageRoot, "mcpb", "manifest.json"), "utf8"),
);
if (manifest.version !== pkg.version) {
  console.log(`manifest version ${manifest.version} -> ${pkg.version} (from package.json)`);
}
writeFileSync(
  path.join(stagingDir, "manifest.json"),
  `${JSON.stringify({ ...manifest, version: pkg.version }, null, 2)}\n`,
);
copyFileSync(path.join(packageRoot, "mcpb", "icon.png"), path.join(stagingDir, "icon.png"));
copyFileSync(builtServer, path.join(stagingDir, "server", "index.js"));

execFileSync("mcpb", ["pack", stagingDir, outputFile], { stdio: "inherit" });

console.log(`Packed ${outputFile}`);
