// Live audit monitor for wcsc-site-dev. Open this in its own PowerShell/cmd
// window while testing: it tails data/audit.log (written by server.js) and
// pretty-prints new activity as it happens — registration/referral
// submissions landing in storage, and request latency.
//
// Run with: node audit-monitor.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const AUDIT_FILE = path.join(ROOT, 'data', 'audit.log');

const RESET = '\x1b[0m';
const GRAY = '\x1b[90m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';

const EVENT_STYLES = {
  submission_created: [GREEN, 'SUBMISSION'],
  referral_merged: [YELLOW, 'MERGED'],
  registration_merged: [YELLOW, 'MERGED'],
};

function timeOf(ts) {
  return new Date(ts).toLocaleTimeString();
}

function formatDetails(details) {
  return Object.entries(details || {})
    .map(([k, v]) => `${k}=${v}`)
    .join('  ');
}

function printRecord(record) {
  if (record.kind === 'request') {
    const line = `${GRAY}${timeOf(record.ts)}${RESET}  ${record.method.padEnd(6)} ${record.route.padEnd(20)} ${String(record.durationMs).padStart(5)}ms  ${record.status}`;
    console.log(line);
    return;
  }
  if (record.kind === 'event') {
    const [color, label] = EVENT_STYLES[record.type] || [CYAN, record.type.toUpperCase()];
    console.log(`${GRAY}${timeOf(record.ts)}${RESET}  ${color}${BOLD}${label.padEnd(16)}${RESET} ${formatDetails(record.details)}`);
  }
}

function waitForFile(file, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function poll() {
      if (fs.existsSync(file)) return resolve();
      if (Date.now() - start > timeoutMs) {
        return reject(new Error(`${file} never appeared — is server.js running?`));
      }
      setTimeout(poll, 500);
    })();
  });
}

async function main() {
  console.log(`${BOLD}Watching wcsc-site-dev activity...${RESET} (Ctrl+C to stop)\n`);
  await waitForFile(AUDIT_FILE);

  let offset = fs.statSync(AUDIT_FILE).size; // skip history, show only new activity
  let reading = false;
  let recheck = false;

  // fs.watch can fire more than once per write (especially on Windows), so
  // overlapping calls are serialized here rather than each starting their
  // own read from the same stale offset, which would print duplicates.
  function readNew() {
    if (reading) { recheck = true; return; }
    const size = fs.statSync(AUDIT_FILE).size;
    if (size <= offset) return;
    const start = offset;
    offset = size; // claim this range before the async read even starts
    reading = true;
    const stream = fs.createReadStream(AUDIT_FILE, { start, end: size - 1 });
    let chunk = '';
    stream.on('data', (d) => (chunk += d));
    stream.on('end', () => {
      chunk.split('\n').filter(Boolean).forEach((line) => {
        try {
          printRecord(JSON.parse(line));
        } catch (e) {
          // ignore partial/malformed lines
        }
      });
      reading = false;
      if (recheck) { recheck = false; readNew(); }
    });
  }

  fs.watch(AUDIT_FILE, { persistent: true }, () => readNew());
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
