// app/src/mappings/overlay.cjs
// In-memory overlay state (YAML is source of truth)

let overlay = {
  playersById: new Map(), // playerId -> player
  playerIdByNickname: new Map(), // nickname -> playerId
  tableByUuid: new Map(), // uuid -> table
  overrides: {}, // {games?, players?}
};

function getOverlay() {
  return overlay;
}

function setOverlay(next) {
  overlay = next;
}

function applyPlayerOverride(playerId, base) {
  const ov = overlay?.overrides?.players?.[playerId];
  if (!ov || typeof ov !== "object") return base;
  return { ...base, ...ov };
}

function applyGameOverride(uuid, base) {
  const ov = overlay?.overrides?.games?.[uuid];
  if (!ov || typeof ov !== "object") return base;
  return { ...base, ...ov };
}

function resolvePlayerByNickname(nickname) {
  const playerId = overlay.playerIdByNickname.get(nickname);
  if (!playerId) {
    return { playerId: null, displayName: nickname, image: undefined, tags: undefined };
  }
  const p = overlay.playersById.get(playerId);
  const base = p
    ? { playerId: p.id, displayName: p.displayName, image: p.image, tags: p.tags }
    : { playerId, displayName: nickname, image: undefined, tags: undefined };

  return applyPlayerOverride(playerId, base);
}

function resolveTableByUuid(uuid) {
  const t = overlay.tableByUuid.get(uuid);
  if (!t) return null;
  return { uuid: t.uuid, label: t.label, note: t.note };
}

module.exports = {
  getOverlay,
  setOverlay,
  applyPlayerOverride,
  applyGameOverride,
  resolvePlayerByNickname,
  resolveTableByUuid,
};
