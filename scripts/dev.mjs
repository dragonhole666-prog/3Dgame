import { spawn } from 'node:child_process';

let shuttingDown = false;
const children = [];

function launch(label, args) {
  const child = spawn(process.execPath, args, { stdio: 'inherit' });
  children.push({ label, child });
  child.on('error', error => {
    console.error(`[dev] ${label} failed to start:`, error);
    shutdown(2);
  });
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    const detail = signal ? `signal=${signal}` : `code=${code ?? 'null'}`;
    console.error(`[dev] ${label} exited unexpectedly (${detail}).`);
    shutdown(typeof code === 'number' && code !== 0 ? code : 2);
  });
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const { child } of children) {
    try { if (!child.killed) child.kill(); } catch {}
  }
  setTimeout(() => process.exit(code), 60).unref();
}

launch('backend', ['--import', 'tsx', 'server/index.ts']);
launch('frontend', ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1']);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(0));
}
