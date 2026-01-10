// app/src/sse/sse.cjs
function createSseHub() {
  const clients = new Set();

  function broadcast(obj) {
    const msg = `data: ${JSON.stringify(obj)}\n\n`;
    for (const res of clients) {
      try {
        res.write(msg);
      } catch (_) {
        // ignore
      }
    }
  }

  function add(res) {
    clients.add(res);
  }

  function remove(res) {
    clients.delete(res);
  }

  return { clients, broadcast, add, remove };
}

module.exports = { createSseHub };
