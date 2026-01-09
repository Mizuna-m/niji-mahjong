// app/src/server.cjs
const fs = require("fs");
const path = require("path");
const express = require("express");
const chokidar = require("chokidar");
const { MongoClient } = require("mongodb");
const { deriveGame } = require("./derive/deriveGame.cjs");

const PORT = Number(process.env.PORT || "3000");
const MONGO_URL = process.env.MONGO_URL || "mongodb://mongo:27017/niji";
const DATA_DIR = process.env.DATA_DIR || "/data";

const app = express();
app.use(express.json({ limit: "50mb" }));

// 開発段階：別ポートの web(3001) から叩くので暫定でCORS許可（リバプロ導入後に絞る）
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// --- Mongo ---
let mongoClient;
let db;
let colRaw;
let colDerived;

// --- SSE ---
const sseClients = new Set();
function sseBroadcast(obj) {
  const msg = `data: ${JSON.stringify(obj)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(msg);
    } catch (_) {
      // ignore
    }
  }
}

async function connectMongo() {
  mongoClient = new MongoClient(MONGO_URL);
  await mongoClient.connect();
  db = mongoClient.db(); // URLのDB名を使用
  colRaw = db.collection("games_raw");
  colDerived = db.collection("games_derived");

  // await colRaw.createIndex({ _id: 1 }, { unique: true });
  // await colDerived.createIndex({ _id: 1 }, { unique: true });

  // 一覧/検索用（必要なら）
  await colDerived.createIndex({ startTime: 1 });
}

function isJsonFile(p) {
  return p.toLowerCase().endsWith(".json");
}

function safeReadJsonFile(filePath) {
  const text = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(text);
}

function guessUuidFromFilename(filePath) {
  const base = path.basename(filePath);
  const m = base.match(/(\d{6}-[0-9a-f-]{36})/i);
  return m ? m[1] : null;
}

async function upsertGameFromFile(filePath) {
  if (!isJsonFile(filePath)) return;

  let json;
  try {
    json = safeReadJsonFile(filePath);
  } catch (e) {
    console.error("[ingest] JSON parse error:", filePath, e?.message || e);
    return;
  }

  const uuid = json?.head?.uuid || guessUuidFromFilename(filePath);
  if (!uuid) {
    console.warn("[ingest] uuid not found:", filePath);
    return;
  }

  const derived = deriveGame(json);

  await colRaw.updateOne(
    { _id: uuid },
    {
      $set: {
        _id: uuid,
        uuid,
        ingestedAt: new Date(),
        filePath,
        head: json?.head ?? null,
        raw: json,
      },
    },
    { upsert: true }
  );

  await colDerived.updateOne(
    { _id: uuid },
    {
      $set: {
        _id: uuid,
        uuid,
        ingestedAt: new Date(),
        filePath,
        derived,
        // 一覧用にトップレベルにも冗長に持つ（projectionが楽）
        players: derived.players,
        finalScores: derived.finalScores,
        startTime: derived.startTime,
        endTime: derived.endTime,
      },
    },
    { upsert: true }
  );

  console.log("[ingest] upserted:", uuid, "players=", derived.players?.map(p => p.nickname).join(" / "));
  sseBroadcast({ type: "ingested", uuid });
}

async function ingestAllExistingJson() {
  if (!fs.existsSync(DATA_DIR)) {
    console.warn("[ingest] DATA_DIR not found:", DATA_DIR);
    return;
  }
  const files = fs.readdirSync(DATA_DIR)
    .map((f) => path.join(DATA_DIR, f))
    .filter((p) => isJsonFile(p));

  for (const f of files) {
    try {
      await upsertGameFromFile(f);
    } catch (e) {
      console.error("[ingest] failed:", f, e?.message || e);
    }
  }
}

// --- API endpoints ---
app.get("/api/health", async (_req, res) => res.json({ ok: true }));

app.get("/api/games", async (_req, res) => {
  const docs = await colDerived
    .find({}, { projection: { _id: 0, uuid: 1, startTime: 1, endTime: 1, players: 1, finalScores: 1 } })
    .sort({ startTime: 1 })
    .toArray();

  res.json({ games: docs });
});

app.get("/api/games/:uuid", async (req, res) => {
  const uuid = req.params.uuid;
  const doc = await colDerived.findOne(
    { _id: uuid },
    { projection: { _id: 0, uuid: 1, derived: 1 } }
  );
  if (!doc) return res.status(404).json({ error: "not found" });
  res.json(doc);
});

// SSE（更新通知）
app.get("/api/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ type: "hello" })}\n\n`);
  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

// --- watcher ---
function startWatcher() {
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
    if (!isJsonFile(p)) return;
    console.log("[watch:add]", p);
    try {
      await upsertGameFromFile(p);
    } catch (e) {
      console.error("[watch:add] failed", p, e?.message || e);
    }
  });

  watcher.on("change", async (p) => {
    if (!isJsonFile(p)) return;
    console.log("[watch:change]", p);
    try {
      await upsertGameFromFile(p);
    } catch (e) {
      console.error("[watch:change] failed", p, e?.message || e);
    }
  });
}

// --- main ---
async function main() {
  await connectMongo();
  console.log("[mongo] connected:", MONGO_URL);

  // 起動直後の安定のために一回取り込み
  await ingestAllExistingJson();

  startWatcher();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[api] listening on :${PORT}`);
  });
}

main().catch((e) => {
  console.error("[fatal]", e);
  process.exit(1);
});
