// app/src/mappings/store.cjs
const { getOverlay } = require("./overlay.cjs");

function listPlayers() {
  const { playersById } = getOverlay();
  return [...playersById.values()].map((p) => ({
    playerId: p.id,
    displayName: p.displayName,
    image: p.image ?? null,
    tags: p.tags ?? null,
  }));
}

function getPlayerProfile(playerId) {
  const { playersById } = getOverlay();
  const p = playersById.get(playerId);
  if (!p) return null;
  return {
    playerId: p.id,
    displayName: p.displayName,
    image: p.image ?? null,
    tags: p.tags ?? null,
  };
}

function listNicknamesByPlayerId(playerId) {
  const { playerIdByNickname } = getOverlay();
  const out = [];
  for (const [nickname, pid] of playerIdByNickname.entries()) {
    if (pid === playerId) out.push(nickname);
  }
  return out;
}

function resolvePlayerIdByNickname(nickname) {
  const { playerIdByNickname } = getOverlay();
  return playerIdByNickname.get(nickname) ?? null;
}

function resolveTableByUuid(uuid) {
  const { tableByUuid } = getOverlay();
  return tableByUuid.get(uuid) ?? null;
}

module.exports = {
  listPlayers,
  getPlayerProfile,
  listNicknamesByPlayerId,
  resolvePlayerIdByNickname,
  resolveTableByUuid,
};
