// app/src/services/enrich.cjs
const {
  resolvePlayerByNickname,
  resolveTableByUuid,
  applyGameOverride,
} = require("../mappings/overlay.cjs");

function enrichPlayers(players) {
  if (!Array.isArray(players)) return [];
  return players.map((p) => {
    const nickname = p?.nickname ?? "";
    const resolved = resolvePlayerByNickname(nickname);

    return {
      seat: typeof p?.seat === "number" ? p.seat : null,
      nickname,
      // overlay
      playerId: resolved.playerId ?? null,
      displayName: resolved.displayName ?? nickname,
      image: resolved.image ?? null,
      tags: resolved.tags ?? null,
    };
  });
}

function enrichPlayerStats(playerStats) {
  if (!Array.isArray(playerStats)) return [];
  return playerStats.map((st) => {
    const nickname = st?.nickname ?? "";
    const resolved = resolvePlayerByNickname(nickname);
    return {
      ...st,
      playerId: resolved.playerId ?? null,
      displayName: resolved.displayName ?? nickname,
      image: resolved.image ?? null,
      tags: resolved.tags ?? null,
    };
  });
}

function enrichDerivedGame(derived) {
  if (!derived || typeof derived !== "object") return derived;
  const out = { ...derived };

  if (Array.isArray(out.players)) out.players = enrichPlayers(out.players);
  if (Array.isArray(out.playerStats)) out.playerStats = enrichPlayerStats(out.playerStats);

  // rounds は量が多いので、ここでは基本そのまま（必要なら winners/loser の表示名も付けられる）
  return out;
}

function enrichTable(uuid) {
  if (!uuid) return null;
  return resolveTableByUuid(uuid); // {uuid,label,note} or null
}

/**
 * /api/games の1行（軽量）
 */
function enrichGameListItem(doc) {
  const base = {
    uuid: doc?.uuid ?? null,
    startTime: doc?.startTime ?? null,
    endTime: doc?.endTime ?? null,
    table: enrichTable(doc?.uuid),
    players: enrichPlayers(doc?.players),
    finalScores: Array.isArray(doc?.finalScores) ? doc.finalScores : null,
  };

  return applyGameOverride(base.uuid, base);
}

/**
 * /api/games/:uuid （詳細）
 */
function enrichGameDetail(doc) {
  const base = {
    uuid: doc?.uuid ?? null,
    table: enrichTable(doc?.uuid),
    derived: enrichDerivedGame(doc?.derived),
  };

  return applyGameOverride(base.uuid, base);
}

module.exports = {
  enrichGameListItem,
  enrichGameDetail,
};
