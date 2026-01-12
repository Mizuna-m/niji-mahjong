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

function normalizeFinalsYaml(doc) {
  if (!doc || typeof doc !== "object") return null;
  const rounds = Array.isArray(doc.rounds) ? doc.rounds : [];
  const outRounds = [];

  for (const r of rounds) {
    if (!r || typeof r !== "object") continue;
    const roundId = String(r.roundId || "").trim();
    const label = String(r.label || "").trim();

    const matches = Array.isArray(r.matches) ? r.matches : [];
    const outMatches = [];

    for (const m of matches) {
      if (!m || typeof m !== "object") continue;

      const matchId = String(m.matchId || "").trim();
      if (!matchId) continue;

      // gameUuids: 配列 or 文字列(カンマ区切り)を許容して正規化
      const rawGameUuids = m.gameUuids;
      const gameUuids = Array.isArray(rawGameUuids)
        ? rawGameUuids
            .flatMap((x) => String(x || "").split(","))
            .map((s) => s.trim())
            .filter(Boolean)
        : (typeof rawGameUuids === "string"
            ? rawGameUuids
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : null);

      // 後方互換: 単発gameUuid（ただし誤って "uuid1,uuid2" が来ても救済）
      const gameUuid =
        m.gameUuid && String(m.gameUuid).trim()
          ? String(m.gameUuid).trim()
          : null;

      // requiredGames: 明示があれば優先、なければ複数戦なら2、単発なら1
      const requiredGames = Number.isFinite(Number(m.requiredGames))
        ? Number(m.requiredGames)
        : (gameUuids && gameUuids.length > 0 ? 2 : 1);

      const seats = Array.isArray(m.seats) ? m.seats : [];

      outMatches.push({
        matchId,
        label: m.label ? String(m.label) : undefined,
        tableLabel: m.tableLabel ? String(m.tableLabel) : undefined,

        // 互換保持
        gameUuid,

        // ★追加
        gameUuids: gameUuids && gameUuids.length > 0 ? gameUuids : null,
        requiredGames,

        seats: seats
          .filter((s) => s && typeof s === "object" && Number.isFinite(Number(s.seat)))
          .map((s) => ({
            seat: Number(s.seat),
            playerId: s.playerId ? String(s.playerId) : undefined,
            nickname: s.nickname ? String(s.nickname) : undefined,
            source: s.source ? String(s.source) : undefined,
          })),
        advance: Array.isArray(m.advance) ? m.advance : [],
      });
    }

    outRounds.push({
      roundId: roundId || null,
      label: label || null,
      matches: outMatches,
    });
  }

  return {
    phase: "finals",
    updatedAt: doc.updatedAt ? String(doc.updatedAt) : null,
    rounds: outRounds,
  };
}

function loadOverlayFromMappingsDir(sse) {
  const pPlayers = path.join(MAPPINGS_DIR, "players.yaml");
  const pIdent = path.join(MAPPINGS_DIR, "identities.yaml");
  const pTables = path.join(MAPPINGS_DIR, "tables.yaml");
  const pOverrides = path.join(MAPPINGS_DIR, "overrides.yaml");
  const pFinals = path.join(MAPPINGS_DIR, "finals.yaml");

  const playersDoc = safeLoadYaml(pPlayers);
  const identDoc = safeLoadYaml(pIdent);
  const tablesDoc = safeLoadYaml(pTables);
  const overridesDoc = safeLoadYaml(pOverrides);
  const finalsDoc = safeLoadYaml(pFinals);

  const players = normalizePlayersYaml(playersDoc);
  const identities = normalizeIdentitiesYaml(identDoc);
  const tables = normalizeTablesYaml(tablesDoc);
  const overrides = normalizeOverridesYaml(overridesDoc);
  const finals = normalizeFinalsYaml(finalsDoc);

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
    finals,
    overrides: overrides || {},
  });

  console.log(
    "[mappings] loaded",
    `players=${playersById.size}`,
    `identities=${playerIdByNickname.size}`,
    `tables=${tableByUuid.size}`,
    `finals=${finals ? "yes" : "no"}`,
  );

  sse?.broadcast?.({ type: "mapping_updated" });
}

module.exports = { loadOverlayFromMappingsDir, MAPPINGS_DIR };
