const sseClients = new Set();

export const registerSseClient = (res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
  sseClients.add(res);
};

export const unregisterSseClient = (res) => {
  sseClients.delete(res);
};

export const broadcastEvent = (eventType, payload = {}) => {
  const data = JSON.stringify({ type: eventType, payload, timestamp: new Date().toISOString() });
  for (const client of sseClients) {
    try {
      client.write(`data: ${data}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
};

export const getConnectedClientCount = () => sseClients.size;

export const closeAllSseClients = () => {
  for (const client of sseClients) {
    try {
      client.end();
    } catch {}
  }
  sseClients.clear();
};

