const expectedRelease = process.argv[2];
const endpoint = process.env.QINGLAN_WS_URL || 'ws://127.0.0.1:8787/socket';
const timeoutMs = Number(process.env.QINGLAN_WS_TIMEOUT_MS || 8000);

if (!expectedRelease || !/^P\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(expectedRelease)) {
  console.error('WORLD SYNC FAIL: expected release argument is missing or invalid.');
  process.exit(2);
}

const validSnapshot = value => {
  const s = value;
  return !!s && typeof s === 'object'
    && !!s.self && typeof s.self === 'object' && typeof s.self.id === 'string'
    && Number.isFinite(s.time)
    && Array.isArray(s.players)
    && Array.isArray(s.monsters)
    && Array.isArray(s.drops)
    && Array.isArray(s.events)
    && Array.isArray(s.listings);
};

let settled = false;
let socket;
const finish = (code, message) => {
  if (settled) return;
  settled = true;
  clearTimeout(timer);
  if (message) (code === 0 ? console.log : console.error)(message);
  try { socket?.close(1000, code === 0 ? 'probe complete' : 'probe failed'); } catch {}
  setTimeout(() => process.exit(code), 10);
};

const timer = setTimeout(() => {
  finish(1, `WORLD SYNC FAIL: no valid syncProbe snapshot within ${timeoutMs} ms (${endpoint}).`);
}, timeoutMs);

try {
  socket = new WebSocket(endpoint);
} catch (error) {
  finish(1, `WORLD SYNC FAIL: WebSocket construction failed: ${error instanceof Error ? error.message : String(error)}`);
}

socket?.addEventListener('open', () => {
  socket.send(JSON.stringify({ type: 'syncProbe', release: expectedRelease }));
});

socket?.addEventListener('message', event => {
  let message;
  try {
    message = JSON.parse(String(event.data));
  } catch (error) {
    finish(1, `WORLD SYNC FAIL: server returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  if (message?.release && message.release !== expectedRelease) {
    finish(1, `WORLD SYNC FAIL: release mismatch (expected ${expectedRelease}, server ${String(message.release)}).`);
    return;
  }
  if (message?.type === 'error') {
    finish(1, `WORLD SYNC FAIL: server error: ${String(message.text || message.code || 'unknown error')}`);
    return;
  }
  if (message?.type !== 'syncProbe') return;
  if (message.release !== expectedRelease) {
    finish(1, `WORLD SYNC FAIL: syncProbe release mismatch (expected ${expectedRelease}, received ${String(message.release)}).`);
    return;
  }
  if (!validSnapshot(message.data)) {
    finish(1, 'WORLD SYNC FAIL: syncProbe returned an incomplete world snapshot.');
    return;
  }
  finish(0, `WORLD SYNC PASS: ${expectedRelease} snapshot handshake OK (players=${message.data.players.length}, monsters=${message.data.monsters.length}).`);
});

socket?.addEventListener('error', () => {
  finish(1, `WORLD SYNC FAIL: WebSocket error while connecting to ${endpoint}.`);
});

socket?.addEventListener('close', event => {
  if (!settled) finish(1, `WORLD SYNC FAIL: socket closed before a valid snapshot (code=${event.code}, reason=${event.reason || 'none'}).`);
});
