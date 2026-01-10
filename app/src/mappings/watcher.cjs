// app/src/mappings/watcher.cjs
const fs = require("fs");
const chokidar = require("chokidar");
const { loadOverlayFromMappingsDir, MAPPINGS_DIR } = require("./loader.cjs");

function startMappingsWatcher({ sse, onReload }) {
  console.log("[watch:mappings] MAPPINGS_DIR =", MAPPINGS_DIR);

  if (!fs.existsSync(MAPPINGS_DIR)) {
    console.warn("[mappings] MAPPINGS_DIR not found:", MAPPINGS_DIR);
    return;
  }

  const watcher = chokidar.watch(MAPPINGS_DIR, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    usePolling: process.env.CHOKIDAR_USEPOLLING === "true",
    interval: 300,
    depth: 2,
  });

  const reload = () => {
    try {
      if (typeof onReload === "function") return onReload();
      loadOverlayFromMappingsDir(sse);
    } catch (e) {
      console.error("[mappings] reload failed:", e?.message || e);
    }
  };

  const isYaml = (p) => p.endsWith(".yaml") || p.endsWith(".yml");

  watcher.on("add", (p) => {
    if (!isYaml(p)) return;
    console.log("[watch:mappings:add]", p);
    reload();
  });

  watcher.on("change", (p) => {
    if (!isYaml(p)) return;
    console.log("[watch:mappings:change]", p);
    reload();
  });

  watcher.on("unlink", (p) => {
    if (!isYaml(p)) return;
    console.log("[watch:mappings:unlink]", p);
    reload();
  });

  watcher.on("error", (e) => console.error("[watch:mappings] error", e));
}

module.exports = { startMappingsWatcher };
