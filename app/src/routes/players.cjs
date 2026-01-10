// app/src/routes/players.cjs
const { getOverlay, applyPlayerOverride } = require("../mappings/overlay.cjs");
const { buildPlayerSummary } = require("../services/playerSummary.cjs");

function mountPlayerRoutes(app, { mongo }) {
  app.get("/api/players", async (_req, res) => {
    const ov = getOverlay();
    const rows = [];
    for (const [id, p] of ov.playersById.entries()) {
      rows.push(applyPlayerOverride(id, { playerId: p.id, displayName: p.displayName, image: p.image, tags: p.tags }));
    }
    rows.sort((a, b) => String(a.displayName).localeCompare(String(b.displayName), "ja"));
    res.json({ players: rows });
  });

  app.get("/api/players/:playerId", async (req, res) => {
    const playerId = req.params.playerId;
    const out = await buildPlayerSummary({ mongo, playerId, limitRecent: 30 });
    if (!out) return res.status(404).json({ error: "player not found" });
    res.json(out);
  });
}

module.exports = { mountPlayerRoutes };
