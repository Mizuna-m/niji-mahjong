// app/src/mappings/loader.cjs
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const { setOverlay } = require("./overlay.cjs");

const MAPPINGS_DIR = process.env.MAPPINGS_DIR || "/mappings";

function existsFile(p) {
  try {
    fs.accessSync(p, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function safeLoadYaml(p) {
  if (!existsFile(p)) return null;
  const text = fs.readFileSync(p, "utf-8");
  if (!text.trim()) return null;
  return yaml.load(text);
}

function normalizePlayersYaml(doc) {
  const arr = Array.isArray(doc?.players) ? doc.players : [];
  const out = [];
  for (const x of arr) {
    if (!x || typeof x !== "object") continue;
    const id = String(x.id || "").trim();
    const displayName = String(x.displayName || "").trim();
    if (!id || !displayName) continue;
    out.push({
      id,
      displayName,
      image: x.image ? String(x.image) : undefined,
      tags: Array.isArray(x.tags) ? x.tags.map(String) : undefined,
    });
  }
  return out;
}

function normalizeIdentitiesYaml(doc) {
  const arr = Array.isArray(doc?.identities) ? doc.identities : [];
  const out = [];
  for (const x of arr) {
    if (!x || typeof x !== "object") continue;
    const nickname = String(x.nickname || "").trim();
    const playerId = String(x.playerId || "").trim();
    if (!nickname || !playerId) continue;
    out.push({ nickname, playerId });
  }
  return out;
}

function normalizeTablesYaml(doc) {
  const arr = Array.isArray(doc?.tables) ? doc.tables : [];
  const out = [];
  for (const x of arr) {
    if (!x || typeof x !== "object") continue;
    const uuid = String(x.uuid || "").trim();
    const label = String(x.label || "").trim();
    if (!uuid || !label) continue;
    out.push({ uuid, label, note: x.note ? String(x.note) : undefined });
  }
  return out;
}

function normalizeOverridesYaml(doc) {
  if (!doc || typeof doc !== "object") return {};
  const games = doc.games && typeof doc.games === "object" ? doc.games : undefined;
  const players = doc.players && typeof doc.players === "object" ? doc.players : undefined;
  return { games, players };
}

function loadOverlayFromMappingsDir(sse) {
  const pPlayers = path.join(MAPPINGS_DIR, "players.yaml");
  const pIdent = path.join(MAPPINGS_DIR, "identities.yaml");
  const pTables = path.join(MAPPINGS_DIR, "tables.yaml");
  const pOverrides = path.join(MAPPINGS_DIR, "overrides.yaml");

  const playersDoc = safeLoadYaml(pPlayers);
  const identDoc = safeLoadYaml(pIdent);
  const tablesDoc = safeLoadYaml(pTables);
  const overridesDoc = safeLoadYaml(pOverrides);

  const players = normalizePlayersYaml(playersDoc);
  const identities = normalizeIdentitiesYaml(identDoc);
  const tables = normalizeTablesYaml(tablesDoc);
  const overrides = normalizeOverridesYaml(overridesDoc);

  const playersById = new Map();
  for (const p of players) playersById.set(p.id, p);

  const playerIdByNickname = new Map();
  for (const it of identities) playerIdByNickname.set(it.nickname, it.playerId);

  const tableByUuid = new Map();
  for (const t of tables) tableByUuid.set(t.uuid, t);

  setOverlay({
    playersById,
    playerIdByNickname,
    tableByUuid,
    overrides: overrides || {},
  });

  console.log(
    "[mappings] loaded",
    `players=${playersById.size}`,
    `identities=${playerIdByNickname.size}`,
    `tables=${tableByUuid.size}`
  );

  sse?.broadcast?.({ type: "mapping_updated" });
}

module.exports = { loadOverlayFromMappingsDir, MAPPINGS_DIR };
