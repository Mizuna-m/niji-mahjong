// app/src/routes/games.cjs
const { enrichGameListItem, enrichGameDetail } = require("../services/enrich.cjs");

function mountGameRoutes(app, { mongo }) {
  app.get("/api/games", async (_req, res) => {
    const docs = await mongo.colDerived
      .find({}, { projection: { _id: 0, uuid: 1, startTime: 1, endTime: 1, players: 1, finalScores: 1 } })
      .sort({ startTime: 1 })
      .toArray();

    res.json({ games: docs.map(enrichGameListItem) });
  });

  app.get("/api/games/:uuid", async (req, res) => {
    const uuid = req.params.uuid;
    const doc = await mongo.colDerived.findOne({ _id: uuid }, { projection: { _id: 0, uuid: 1, derived: 1 } });
    if (!doc) return res.status(404).json({ error: "not found" });
    res.json(enrichGameDetail(doc));
  });
}

module.exports = { mountGameRoutes };
