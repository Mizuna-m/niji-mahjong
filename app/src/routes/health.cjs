// app/src/routes/health.cjs
function mountHealthRoutes(app) {
  app.get("/api/health", async (_req, res) => res.json({ ok: true }));
}

module.exports = { mountHealthRoutes };
