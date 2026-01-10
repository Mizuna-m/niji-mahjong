// app/src/ingest/watcher.cjs
const chokidar = require("chokidar");
const { DATA_DIR, upsertGameFromFile } = require("./ingest.cjs");

function startDataWatcher({ mongo, sse }) {
  console.log("[watch] DATA_DIR =", DATA_DIR);

  const watcher = chokidar.watch(DATA_DIR, {
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
    usePolling: process.env.CHOKIDAR_USEPOLLING === "true",
    interval: Number(process.env.CHOKIDAR_INTERVAL || "500"),
    depth: 5,
  });

  watcher.on("ready", () => console.log("[watch] ready"));
  watcher.on("error", (e) => console.error("[watch] error", e));

  watcher.on("add", async (p) => {
    if (!p.toLowerCase().endsWith(".json")) return;
    console.log("[watch:add]", p);
    try {
      await upsertGameFromFile({ mongo, sse, filePath: p });
    } catch (e) {
      console.error("[watch:add] failed", p, e?.message || e);
    }
  });

  watcher.on("change", async (p) => {
    if (!p.toLowerCase().endsWith(".json")) return;
    console.log("[watch:change]", p);
    try {
      await upsertGameFromFile({ mongo, sse, filePath: p });
    } catch (e) {
      console.error("[watch:change] failed", p, e?.message || e);
    }
  });
}

module.exports = { startDataWatcher };
