// Astro 7's `astro dev` always forks itself into a detached background daemon and
// exits almost immediately (it's designed to be managed via `astro dev status/stop/logs`).
// Playwright's `webServer.command`, however, treats any exit before the target URL
// responds as a fatal "Process from config.webServer exited early" error — a race that
// the daemon loses more often than not. This wrapper starts the daemon and actively
// polls the URL until it responds *before* exiting, so by the time this process ends,
// readiness is already guaranteed and Playwright never sees a premature exit.
import { spawn } from 'node:child_process';
import http from 'node:http';

const URL = process.env.WAIT_FOR_ASTRO_URL || 'http://localhost:4321';
const TIMEOUT_MS = 60000;
const POLL_INTERVAL_MS = 300;

function checkReady(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitUntilReady(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await checkReady(url)) return true;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return false;
}

const child = spawn(
  process.execPath,
  ['node_modules/astro/bin/astro.mjs', 'dev', '--background'],
  { stdio: 'inherit' }
);

child.on('exit', async () => {
  // The astro daemon forks and its launcher exits almost immediately (exit code is not
  // meaningful here — "already running" also exits non-zero); the readiness poll below
  // is the real source of truth.
  const ready = await waitUntilReady(URL, TIMEOUT_MS);
  if (!ready) {
    console.error(`Timed out waiting for ${URL} to respond.`);
    process.exit(1);
  }
  console.log(`${URL} is ready.`);
  // Playwright's webServer expects the command process itself to stay alive for the
  // whole test run (it uses the process's continued existence as its own liveness
  // signal, separate from the URL check) — so this wrapper idles forever instead of
  // exiting once the (now detached) astro daemon is confirmed ready.
  setInterval(() => {}, 1 << 30);
});
