import { rm } from "node:fs/promises";

const mode = (process.argv[2] || "all").toLowerCase();

const targetsByMode = {
  deps: ["backend/node_modules", "frontend/node_modules"],
  build: ["frontend/dist"],
  all: ["backend/node_modules", "frontend/node_modules", "frontend/dist"],
};

const targets = targetsByMode[mode];
if (!targets) {
  console.error(
    `Unknown mode "${mode}". Use: all (default), deps, or build.\n` +
      "Examples:\n" +
      "  npm run clean\n" +
      "  npm run clean:deps\n" +
      "  npm run clean:build",
  );
  process.exit(1);
}

let removedCount = 0;
for (const target of targets) {
  // force:true makes this safe to run even if the directory doesn't exist
  await rm(target, { recursive: true, force: true });
  removedCount += 1;
  console.log(`Removed ${target}`);
}

console.log(`Done. Removed ${removedCount} path(s).`);

