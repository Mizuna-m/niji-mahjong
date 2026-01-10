// app/src/routes/stats.cjs
const { buildLeaderboard, buildCumulative } = require("../services/stats.cjs");

function mountStatsRoutes(app, { mongo }) {
  app.get("/api/stats/leaderboard", async (req, res) => {
    const metric = String(req.query.metric || "deltaTotal");
    const limit = Math.max(1, Math.min(200, Number(req.query.limit || "50")));
    const out = await buildLeaderboard({ mongo, metric, limit });
    res.json(out);
  });

  app.get("/api/stats/cumulative", async (req, res) => {
    const limitGames = Math.max(1, Math.min(5000, Number(req.query.limitGames || "2000")));
    const out = await buildCumulative({ mongo, limitGames });
    res.json(out);
  });
}

module.exports = { mountStatsRoutes };
