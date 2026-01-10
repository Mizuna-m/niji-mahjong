// app/src/services/enrich.cjs
const { applyGameOverride, resolvePlayerByNickname, resolveTableByUuid } = require("../mappings/overlay.cjs");

function enrichGameListItem(doc) {
  const uuid = doc.uuid;
  const table = resolveTableByUuid(uuid);

  const players = (doc.players || []).map((p) => {
    const r = resolvePlayerByNickname(p?.nickname ?? "");
    return {
      seat: p?.seat ?? null,
      nickname: p?.nickname ?? "",
      playerId: r.playerId,
      displayName: r.displayName,
      image: r.image,
      tags: r.tags,
    };
  });

  const base = {
    uuid,
    startTime: doc.startTime ?? null,
    endTime: doc.endTime ?? null,
    table,
    players,
    finalScores: doc.finalScores ?? null,
  };

  return applyGameOverride(uuid, base);
}

function enrichGameDetail(doc) {
  const uuid = doc.uuid;
  const table = resolveTableByUuid(uuid);

  const derived = doc.derived || {};
  const players = (derived.players || []).map((p) => {
    const r = resolvePlayerByNickname(p?.nickname ?? "");
    return {
      seat: p?.seat ?? null,
      nickname: p?.nickname ?? "",
      playerId: r.playerId,
      displayName: r.displayName,
      image: r.image,
      tags: r.tags,
    };
  });

  const playerStats = (derived.playerStats || []).map((st) => {
    const r = resolvePlayerByNickname(st?.nickname ?? "");
    return {
      ...st,
      playerId: r.playerId,
      displayName: r.displayName,
      image: r.image,
    };
  });

  const base = {
    uuid,
    table,
    derived: { ...derived, players, playerStats },
  };

  return applyGameOverride(uuid, base);
}

module.exports = { enrichGameListItem, enrichGameDetail };
