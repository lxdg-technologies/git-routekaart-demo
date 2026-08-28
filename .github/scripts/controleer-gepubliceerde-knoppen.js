#!/usr/bin/env node
/* Controleer de werkelijk gerenderde knoppen op de drie gepubliceerde omgevingen. */
const http = require("http");
const net = require("net");
const { spawn } = require("child_process");

const BASE_URL = (process.env.SITE_BASE_URL || "https://lxdg-technologies.github.io/git-routekaart-demo").replace(/\/$/, "");
const DEV_PR = process.env.DEV_PR_NUMBER || "";
const pages = [
  { name: "live", path: "/", expected: [] },
  { name: "test", path: "/test/", expected: ["btn-live-overlay"] },
];
if (DEV_PR) pages.push({ name: "ontwikkel", path: `/dev/pr-${DEV_PR}/`, expected: ["btn-review-approve", "btn-review-reject"] });

function controleerKnoppen(environment, buttons) {
  const expected = environment === "live" ? [] : environment === "test" ? ["btn-live-overlay"] : ["btn-review-approve", "btn-review-reject"];
  const counts = Object.fromEntries(expected.map(id => [id, buttons.filter(button => button.id === id).length]));
  const forbidden = buttons.filter(button => !expected.includes(button.id) && ["btn-live-overlay", "btn-review-approve", "btn-review-reject"].includes(button.id)).map(button => button.id);
  const errors = [];
  for (const id of expected) if (counts[id] !== 1) errors.push(`${environment}: knop ${id} staat ${counts[id]} keer op de pagina, verwacht 1`);
  if (forbidden.length) errors.push(`${environment}: verkeerde knop(pen) op de pagina: ${forbidden.join(", ")}`);
  return errors;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function json(url) { return new Promise((resolve, reject) => { http.get(url, response => { let body = ""; response.on("data", chunk => body += chunk); response.on("end", () => { try { resolve(JSON.parse(body)); } catch (error) { reject(error); } }); }).on("error", reject); }); }
class WsClient {
  constructor(url) { this.url = new URL(url); this.socket = null; this.buffer = Buffer.alloc(0); this.pending = new Map(); this.nextId = 1; }
  async connect() { await new Promise((resolve, reject) => { this.socket = net.createConnection(Number(this.url.port), this.url.hostname, () => { const key = Buffer.from(Math.random().toString()).toString("base64"); this.socket.write(`GET ${this.url.pathname} HTTP/1.1\r\nHost: ${this.url.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`); }); let head = Buffer.alloc(0); const ready = data => { head = Buffer.concat([head, data]); const end = head.indexOf("\r\n\r\n"); if (end < 0) return; if (!head.subarray(0, end).toString().includes("101")) return reject(new Error("Chrome DevTools WebSocket handshake mislukt")); this.socket.removeListener("data", ready); this.socket.on("data", data2 => this.receive(data2)); const rest = head.subarray(end + 4); if (rest.length) this.receive(rest); resolve(); }; this.socket.on("data", ready); this.socket.on("error", reject); }); }
  receive(data) { this.buffer = Buffer.concat([this.buffer, data]); while (this.buffer.length >= 2) { const first = this.buffer[0], second = this.buffer[1]; let length = second & 127, offset = 2; if (length === 126) { if (this.buffer.length < 4) return; length = this.buffer.readUInt16BE(2); offset = 4; } if (this.buffer.length < offset + length) return; const payload = this.buffer.subarray(offset, offset + length); this.buffer = this.buffer.subarray(offset + length); if ((first & 15) === 1) { const message = JSON.parse(payload); const pending = this.pending.get(message.id); if (pending) { this.pending.delete(message.id); message.error ? pending.reject(new Error(JSON.stringify(message.error))) : pending.resolve(message.result); } } } }
  command(method, params = {}) { const id = this.nextId++; return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); const text = Buffer.from(JSON.stringify({ id, method, params })); const mask = Buffer.from([1, 2, 3, 4]); const payload = Buffer.from(text); for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4]; const header = text.length < 126 ? Buffer.from([129, 128 | text.length]) : Buffer.from([129, 254, text.length >> 8, text.length & 255]); this.socket.write(Buffer.concat([header, mask, payload])); }); }
  close() { this.socket.end(); }
}
async function chromePage() {
  const port = 9231;
  const chrome = spawn(process.env.CHROME_BIN || "google-chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", `--user-data-dir=${process.cwd()}/.chrome-control-${process.pid}`, `--remote-debugging-port=${port}`, "about:blank"], { stdio: "ignore" });
  try { let target; for (let i = 0; i < 50; i++) { try { target = (await json(`http://127.0.0.1:${port}/json/list`)).find(item => item.type === "page"); if (target) break; } catch {} await sleep(100); } if (!target) throw new Error("Chrome startte niet"); const cdp = new WsClient(target.webSocketDebuggerUrl); await cdp.connect(); await cdp.command("Runtime.enable"); return { chrome, cdp }; } catch (error) { chrome.kill(); throw error; }
}
async function checkPage(cdp, page) {
  const url = `${BASE_URL}${page.path}`;
  let lastError = "pagina is nog niet gepubliceerd";
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      await cdp.command("Page.navigate", { url }); await sleep(2500);
      const result = await cdp.command("Runtime.evaluate", { expression: `JSON.stringify([...document.querySelectorAll('button')].map(button => ({id: button.id, text: button.textContent.trim()})))`, returnByValue: true });
      const buttons = JSON.parse(result.result.value);
      const errors = controleerKnoppen(page.name, buttons);
      if (!errors.length) { console.log(`ok  : ${page.name}: juiste knoppen staan op ${url}`); return; }
      lastError = errors.join("; ");
    } catch (error) { lastError = `${page.name}: pagina kon niet worden opgehaald: ${error.message}`; }
    await sleep(5000);
  }
  throw new Error(lastError);
}
async function main() {
  const { chrome, cdp } = await chromePage();
  try { for (const page of pages) await checkPage(cdp, page); console.log("\nALLE GEPUBLICEERDE-KNOPPEN-CHECKS GESLAAGD"); }
  finally { cdp.close(); chrome.kill(); }
}
if (require.main === module) main().catch(error => { console.error(`FAIL: ${error.message}`); process.exitCode = 1; });
module.exports = { controleerKnoppen };
