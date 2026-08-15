// Browser quality gate: builds each published environment in Chrome and measures the rendered DOM.
// Run with: node test/browser-quality.js
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const net = require("net");
const { spawn, execFileSync } = require("child_process");

const repo = path.join(__dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "routekaart-browser-"));
const published = path.join(temp, "site");
fs.mkdirSync(path.join(published, "test"), { recursive: true });
fs.mkdirSync(path.join(published, "dev", "pr-156"), { recursive: true });
fs.copyFileSync(path.join(repo, "index.html"), path.join(published, "index.html"));
for (const [environment, target] of [["test", "test/index.html"], ["development", "dev/pr-156/index.html"]]) {
  fs.copyFileSync(path.join(repo, "index.html"), path.join(published, target));
  execFileSync("bash", [path.join(repo, ".github", "scripts", "omgevingsbalk.sh"), path.join(published, target), environment, "issue #156", "1560000", "v1.2.47"], { stdio: "pipe" });
}

const server = http.createServer((request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const relative = requestPath.endsWith("/") ? `${requestPath}index.html` : requestPath;
  const file = path.resolve(published, `.${relative}`);
  if (!file.startsWith(`${published}${path.sep}`) && file !== path.join(published, "index.html")) {
    response.writeHead(403); response.end(); return;
  }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); response.end(data);
  });
});

function listen(server) { return new Promise(resolve => server.listen(0, "0.0.0.0", () => resolve(server.address().port))); }
function getJson(url, method = "GET") {
  return new Promise((resolve, reject) => {
    const request = http.request(url, { method }, response => {
      let body = ""; response.setEncoding("utf8"); response.on("data", chunk => body += chunk);
      response.on("end", () => { try { resolve(JSON.parse(body)); } catch (error) { reject(error); } });
    });
    request.on("error", reject); request.end();
  });
}
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// Dependency-free Chrome DevTools Protocol client.
class WsClient {
  constructor(url) { this.url = new URL(url); this.socket = null; this.buffer = Buffer.alloc(0); this.pending = new Map(); this.nextId = 1; }
  async connect() { await new Promise((resolve, reject) => { this.socket = net.createConnection(Number(this.url.port), this.url.hostname, () => { const key = Buffer.from(Math.random().toString()).toString("base64"); this.socket.write(`GET ${this.url.pathname} HTTP/1.1\r\nHost: ${this.url.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`); }); let head = Buffer.alloc(0); const ready = data => { head = Buffer.concat([head, data]); const end = head.indexOf("\r\n\r\n"); if (end < 0) return; if (!head.subarray(0, end).toString().includes("101")) return reject(new Error("WebSocket handshake mislukt")); this.socket.removeListener("data", ready); this.socket.on("data", data2 => this.receive(data2)); const rest = head.subarray(end + 4); if (rest.length) this.receive(rest); resolve(); }; this.socket.on("data", ready); this.socket.on("error", reject); }); }
  receive(data) { this.buffer = Buffer.concat([this.buffer, data]); while (this.buffer.length >= 2) { const first = this.buffer[0], second = this.buffer[1]; let length = second & 127, offset = 2; if (length === 126) { if (this.buffer.length < 4) return; length = this.buffer.readUInt16BE(2); offset = 4; } if (this.buffer.length < offset + length) return; const payload = this.buffer.subarray(offset, offset + length); this.buffer = this.buffer.subarray(offset + length); if ((first & 15) === 1) { const message = JSON.parse(payload); const pending = this.pending.get(message.id); if (pending) { this.pending.delete(message.id); message.error ? pending.reject(new Error(JSON.stringify(message.error))) : pending.resolve(message.result); } } } }
  command(method, params = {}) { const id = this.nextId++; return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); const text = Buffer.from(JSON.stringify({ id, method, params })), mask = Buffer.from([1, 2, 3, 4]), payload = Buffer.from(text); for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4]; const header = text.length < 126 ? Buffer.from([129, 128 | text.length]) : Buffer.from([129, 254, text.length >> 8, text.length & 255]); this.socket.write(Buffer.concat([header, mask, payload])); }); }
  close() { this.socket.end(); }
}

const measure = `(() => {
  const out = { environment: location.pathname, errors: [] };
  const note = document.querySelector('[role="note"]');
  const style = el => el && getComputedStyle(el);
  const ratio = (a, b) => { const channel = v => { const n = Number(v) / 255; return n <= .03928 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }; const rgb = v => v.match(/[\\d.]+/g).slice(0, 3).map(Number).map(channel); const lum = v => { const [r,g,bl] = rgb(v); return .2126*r + .7152*g + .0722*bl; }; const x=lum(a), y=lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
  const code = note && note.querySelector('code');
  out.contrast = code ? ratio(style(code).color, style(code).backgroundColor) : null;
  const actionIds = out.environment.includes('/dev/') ? ['btn-review-approve','btn-review-reject'] : out.environment.includes('/test/') ? ['btn-live-overlay'] : [];
  out.actions = { expected: actionIds, inNote: actionIds.filter(id => note && note.contains(document.getElementById(id))).length, total: actionIds.reduce((n,id) => n + document.querySelectorAll('#'+id).length, 0), allButtons: document.querySelectorAll('[role="note"] button, #btn-live-overlay, #btn-review-approve, #btn-review-reject').length, forbidden: [...document.querySelectorAll('[role="note"] button')].filter(button => !actionIds.includes(button.id)).map(button => button.id) };
  out.markerChecks = [...document.querySelectorAll('circle[data-environment]')].map(marker => {
    const cx = Number(marker.getAttribute('cx')), cy = Number(marker.getAttribute('cy')), r = Number(marker.getAttribute('r'));
    const station = [...document.querySelectorAll('circle.station-hit + circle, circle.station-hit ~ circle')].find(candidate => Number(candidate.getAttribute('cx')) === cx && Number(candidate.getAttribute('cy')) > cy && Number(candidate.getAttribute('cy')) - Number(candidate.getAttribute('r')) > cy + r);
    const stationCy = station ? Number(station.getAttribute('cy')) : null, stationR = station ? Number(station.getAttribute('r')) : null;
    const svg = marker.ownerSVGElement, view = svg.viewBox.baseVal;
    return { environment: marker.dataset.environment, gap: stationCy === null ? null : stationCy - stationR - (cy + r), inside: cy-r >= view.y && cy+r <= view.y+view.height && cx-r >= view.x && cx+r <= view.x+view.width };
  });
  out.legend = ['dev','test','live'].map(environment => { const marker = document.querySelector('#legend i.env-marker.'+environment), card = document.querySelector('.env-marker.'+environment); return { environment, present: Boolean(marker), shape: marker && getComputedStyle(marker).borderRadius, color: marker && getComputedStyle(marker).backgroundColor, cardColor: card && getComputedStyle(card).backgroundColor }; });
  return out;
})()`;

(async () => {
  const port = await listen(server); const chrome = spawn(process.env.CHROME_BIN || "google-chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", `--user-data-dir=${temp}/chrome-profile`, "--remote-debugging-port=9231", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  try {
    let page;
    for (let attempt = 0; attempt < 30; attempt++) { try { page = (await getJson("http://127.0.0.1:9231/json/list")).find(target => target.type === "page"); if (page) break; } catch {} await sleep(100); }
    if (!page) throw new Error("Chrome startte niet met een DevTools-pagina");
    const cdp = new WsClient(page.webSocketDebuggerUrl); await cdp.connect(); await cdp.command("Runtime.enable");
    const results = [];
    for (const [route, host] of [["dev/pr-156/", "localhost"], ["test/", "127.0.0.2"], ["", "127.0.0.2"]]) {
      await cdp.command("Page.navigate", { url: `http://${host}:${port}/${route}` }); await sleep(2500);
      const value = await cdp.command("Runtime.evaluate", { expression: measure, returnByValue: true }); results.push(value.result.value);
    }
    let failures = 0;
    const check = (ok, message, detail = "") => { if (ok) console.log(`ok  : ${message}`); else { failures++; console.error(`FAIL: ${message}${detail ? ` — ${detail}` : ""}`); } };
    for (const result of results) {
      const label = result.environment.includes("/dev/") ? "ontwikkel" : result.environment.includes("/test/") ? "test" : "live";
      check(label === "live" ? !result.contrast : result.contrast >= 4.5, `${label}: versietekst heeft browsercontrast ${result.contrast === null ? "ontbreekt" : result.contrast.toFixed(2)} (verwacht minimaal 4,5)`);
      check(result.actions.inNote === result.actions.expected.length && result.actions.total === result.actions.expected.length && result.actions.allButtons === result.actions.expected.length && result.actions.forbidden.length === 0, `${label}: actieknoppen staan precies één keer in de omgevingsbalk`, JSON.stringify(result.actions));
      check(result.markerChecks.length === 3 && result.markerChecks.every(marker => marker.gap >= 4 && marker.inside), `${label}: alle omgevingsbolletjes hebben gemeten tussenruimte en vallen binnen het tekenvlak`, JSON.stringify(result.markerChecks));
      check(result.legend.every(item => item.present && item.shape === "50%" && item.color === item.cardColor), `${label}: legenda bevat drie ronde bolletjes met dezelfde kleur als de kaart`, JSON.stringify(result.legend));
    }
    console.log(`\\n${failures ? `${failures} browser-check(s) gefaald` : "ALLE BROWSER-CHECKS GESLAAGD"}`); process.exitCode = failures ? 1 : 0;
    cdp.close();
  } finally { chrome.kill(); server.close(); try { fs.rmSync(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch {} }
})().catch(error => { console.error(`FAIL: browser-quality kon niet draaien — ${error.message}`); process.exitCode = 1; chromeKillFallback(); });
function chromeKillFallback() {}
