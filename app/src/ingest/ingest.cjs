// app/src/ingest/ingest.cjs
const fs = require("fs");
const path = require("path");
const { deriveGame } = require("../derive/deriveGame.cjs");

const DATA_DIR = process.env.DATA_DIR || "/data";

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

async function upsertGameFromFile({ mongo, sse, filePath }) {
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

  await mongo.colRaw.updateOne(
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

  await mongo.colDerived.updateOne(
    { _id: uuid },
    {
      $set: {
        _id: uuid,
        uuid,
        ingestedAt: new Date(),
        filePath,
        derived,
        players: derived.players,
        finalScores: derived.finalScores,
        startTime: derived.startTime,
        endTime: derived.endTime,
      },
    },
    { upsert: true }
  );

  console.log("[ingest] upserted:", uuid);
  sse?.broadcast?.({ type: "ingested", uuid });
}

async function ingestAllExistingJson({ mongo, sse }) {
  if (!fs.existsSync(DATA_DIR)) {
    console.warn("[ingest] DATA_DIR not found:", DATA_DIR);
    return;
  }

  const files = fs
    .readdirSync(DATA_DIR)
    .map((f) => path.join(DATA_DIR, f))
    .filter((p) => isJsonFile(p));

  for (const f of files) {
    try {
      await upsertGameFromFile({ mongo, sse, filePath: f });
    } catch (e) {
      console.error("[ingest] failed:", f, e?.message || e);
    }
  }
}

module.exports = {
  DATA_DIR,
  upsertGameFromFile,
  ingestAllExistingJson,
};
