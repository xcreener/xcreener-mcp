import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const stagingDir = path.join(packageRoot, "dist-mcpb", "bundle");
const outputFile = path.join(packageRoot, "dist-mcpb", "xcreener.mcpb");
const builtServer = path.join(packageRoot, "dist", "index.js");

rmSync(path.join(packageRoot, "dist-mcpb"), { recursive: true, force: true });
mkdirSync(path.join(stagingDir, "server"), { recursive: true });

copyFileSync(path.join(packageRoot, "mcpb", "manifest.json"), path.join(stagingDir, "manifest.json"));
copyFileSync(path.join(packageRoot, "mcpb", "icon.png"), path.join(stagingDir, "icon.png"));
copyFileSync(builtServer, path.join(stagingDir, "server", "index.js"));

execFileSync("mcpb", ["pack", stagingDir, outputFile], { stdio: "inherit" });

console.log(`Packed ${outputFile}`);
