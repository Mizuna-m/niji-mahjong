// app/src/routes/stream.cjs
function mountStreamRoutes(app, { sse }) {
  app.get("/api/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    res.write(`data: ${JSON.stringify({ type: "hello" })}\n\n`);
    sse.add(res);

    req.on("close", () => sse.remove(res));
  });
}

module.exports = { mountStreamRoutes };
