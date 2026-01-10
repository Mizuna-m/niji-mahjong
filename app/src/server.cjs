// app/src/server.cjs
const express = require("express");

const { connectMongo } = require("./db/mongo.cjs");
const { createSseHub } = require("./sse/sse.cjs");

const { loadOverlayFromMappingsDir } = require("./mappings/loader.cjs");
const { startMappingsWatcher } = require("./mappings/watcher.cjs");

const { ingestAllExistingJson } = require("./ingest/ingest.cjs");
const { startDataWatcher } = require("./ingest/watcher.cjs");

const { mountHealthRoutes } = require("./routes/health.cjs");
const { mountStreamRoutes } = require("./routes/stream.cjs");
const { mountGameRoutes } = require("./routes/games.cjs");
const { mountPlayersRoutes } = require("./routes/players.cjs");
const { mountStatsRoutes } = require("./routes/stats.cjs");
const { mountTournamentRoutes } = require("./routes/tournament.cjs");
const mappings = require("./mappings/store.cjs");
const { mountTournamentMetaRoutes } = require("./routes/tournamentMeta.cjs");
const { mountTournamentKpiRoutes } = require("./routes/tournamentKpi.cjs");

const PORT = Number(process.env.PORT || "3000");

async function main() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));

  // Dev CORS (tighten later)
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  const sse = createSseHub();

  // Load YAML overlay early (server can run even if missing)
  try {
    loadOverlayFromMappingsDir(sse);
  } catch (e) {
    console.warn("[mappings] initial load failed:", e?.message || e);
  }

  // Connect DB
  const mongo = await connectMongo();
  console.log("[mongo] connected");

  // One-shot ingest existing files
  await ingestAllExistingJson({ mongo, sse });

  // Watchers
  startDataWatcher({ mongo, sse });
  startMappingsWatcher({
    sse,
    onReload: () => loadOverlayFromMappingsDir(sse),
  });

  // Routes (thin)
  mountHealthRoutes(app);
  mountStreamRoutes(app, { sse });
  mountGameRoutes(app, { mongo });
  mountPlayersRoutes(app, { mongo, mappings });
  mountStatsRoutes(app, { mongo, mappings });
  mountTournamentRoutes(app, { mongo });
  mountTournamentMetaRoutes(app);
  mountTournamentKpiRoutes(app, { mongo });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[api] listening on :${PORT}`);
  });
}

main().catch((e) => {
  console.error("[fatal]", e);
  process.exit(1);
});
