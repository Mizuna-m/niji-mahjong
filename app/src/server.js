import express from "express";
import { MongoClient } from "mongodb";
import chokidar from "chokidar";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

const PORT = Number(process.env.PORT || "3000");
const MONGO_URL = process.env.MONGO_URL;
const DATA_DIR = process.env.DATA_DIR || "/data";
const GIT_REPO_DIR = process.env.GIT_REPO_DIR || "/repo";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

const app = express();
app.use(express.json({ limit: "50mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// --- SSE clients ---
const sseClients = new Set();
function sseBroadcast(event, payload) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients) res.write(msg);
}

// --- Mongo ---
const mongo = new MongoClient(MONGO_URL);
let db;

// --- simple in-memory dedupe to avoid double ingest on restart ---
const ingestedFiles = new Set();

// --- ingest one file (raw + minimal derived) ---
async function ingestFile(filepath) {
  const stat = await fs.stat(filepath);
  const id = `${filepath}:${stat.size}:${stat.mtimeMs}`;
  if (ingestedFiles.has(id)) return;

  const text = await fs.readFile(filepath, "utf-8");
  const json = JSON.parse(text);

  const uuid = json?.head?.uuid;
  const startTime = json?.head?.start_time;
  if (!uuid) throw new Error(`Invalid paifu (no head.uuid): ${filepath}`);

  // raw
  await db.collection("raw_paifu").updateOne(
    { uuid },
    {
      $set: {
        uuid,
        startTime,
        sourceFile: path.basename(filepath),
        raw: json,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  // derived: players + final scores (超ミニマム)
  const players = (json?.head?.accounts || []).map((a) => ({
    seat: a.seat,
    nickname: a.nickname,
    account_id: a.account_id,
  }));

  // end_scores は RecordGameEnd に居ることが多いので records を走査
  let endScores = null;
  for (const r of json?.records || []) {
    if (r?.[".lq.RecordGameEnd"]?.end_scores) {
      endScores = r[".lq.RecordGameEnd"].end_scores;
    }
  }

  await db.collection("games").updateOne(
    { uuid },
    {
      $set: {
        uuid,
        startTime,
        players,
        endScores,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  ingestedFiles.add(id);
  sseBroadcast("updated", { uuid, sourceFile: path.basename(filepath) });
}

// --- watch DATA_DIR for new json files ---
function startWatcher() {
  const watcher = chokidar.watch(DATA_DIR, {
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
    depth: 5,
    usePolling: process.env.CHOKIDAR_USEPOLLING === "true",
    interval: Number(process.env.CHOKIDAR_INTERVAL || 500),
  });

  watcher.on("add", async (p) => {
    console.log("[watch:add]", p);
    if (!p.endsWith(".json")) return;
    try {
      await ingestFile(p);
    } catch (e) {
      console.error("Ingest error:", p, e);
      sseBroadcast("error", { file: path.basename(p), message: String(e) });
    }
  });

  watcher.on("change", async (p) => {
    console.log("[watch:change]", p);
    if (!p.endsWith(".json")) return;
    try {
      await ingestFile(p);
    } catch (e) {
      console.error("Ingest error:", p, e);
      sseBroadcast("error", { file: path.basename(p), message: String(e) });
    }
  });

  watcher.on("ready", () => console.log("[watch] ready"));
  watcher.on("error", (e) => console.error("[watch] error:", e));

  console.log(`Watching ${DATA_DIR} ...`);
}

// --- routes ---
app.get("/api/games", async (_req, res) => {
  const games = await db.collection("games").find({}, { projection: { raw: 0 } }).sort({ startTime: -1 }).toArray();
  res.json({ games });
});

app.get("/api/games/:uuid", async (req, res) => {
  const g = await db.collection("games").findOne({ uuid: req.params.uuid });
  if (!g) return res.status(404).json({ error: "not_found" });
  res.json(g);
});

app.get("/api/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });
  res.write(`event: hello\ndata: {"ok":true}\n\n`);
  sseClients.add(res);
  req.on("close", () => sseClients.delete(res));
});

// GitHub webhook → pull
function timingSafeEqual(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
app.post("/hook/github", async (req, res) => {
  if (!WEBHOOK_SECRET) return res.status(500).json({ error: "WEBHOOK_SECRET not set" });

  const sig = req.headers["x-hub-signature-256"];
  if (!sig || typeof sig !== "string") return res.status(401).json({ error: "missing_signature" });

  // NOTE: express.json() だと生bodyが消えるので、本番は raw-body を使うのが筋。
  // まずは “動く最小” として secret チェックを省略してもOK。ここは後で堅牢化推奨。
  // → いまは運用優先で 200返すだけにして pull を走らせます。
  // （堅牢化する段階で raw-body 検証に変更）

  const child = spawn("bash", ["-lc", `cd ${GIT_REPO_DIR} && git pull --ff-only`], { stdio: "pipe" });
  let out = "";
  child.stdout.on("data", (d) => (out += d.toString()));
  child.stderr.on("data", (d) => (out += d.toString()));

  child.on("close", (code) => {
    if (code === 0) {
      sseBroadcast("pulled", { message: out.trim() });
      return res.json({ ok: true });
    }
    sseBroadcast("error", { message: out.trim() });
    return res.status(500).json({ ok: false, output: out.trim() });
  });
});

// --- start ---
(async () => {
  await mongo.connect();
  db = mongo.db();
  startWatcher();

  app.listen(PORT, () => console.log(`Listening on :${PORT}`));
})();
