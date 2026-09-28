// Encodes captured frames into a WebM inside Edge (MediaRecorder), no ffmpeg.
// Usage: node encode.js <framesDir> <output.webm>
const { chromium } = require("playwright-core");
const http = require("http");
const fs = require("fs");
const path = require("path");

const [framesDir, outFile] = process.argv.slice(2);
const index = JSON.parse(fs.readFileSync(path.join(framesDir, "frames.json"), "utf8"));
if (!index.length) throw new Error("no frames captured");

const PAGE = `<!doctype html><html><body style="margin:0;background:#000">
<canvas id="c"></canvas>
<script>
async function run(width, height) {
  const index = await (await fetch("/frames.json")).json();
  const canvas = document.getElementById("c");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  const stream = canvas.captureStream(30);
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm;codecs=vp8";
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
  let uploads = Promise.resolve();
  rec.ondataavailable = (e) => { if (e.data.size) { const blob = e.data; uploads = uploads.then(() => fetch("/chunk", { method: "POST", body: blob })); } };
  const load = (i) => { const img = new Image(); img.src = "/" + index[i].file; return img.decode().then(() => img); };
  const ahead = 8; const queue = [];
  for (let i = 0; i < Math.min(ahead, index.length); i++) queue.push(load(i));
  rec.start(1000);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < index.length; i++) {
    const img = await queue.shift();
    if (i + ahead < index.length) queue.push(load(i + ahead));
    ctx.drawImage(img, 0, 0, width, height);
    const next = i + 1 < index.length ? index[i + 1].t : index[i].t + 1.5;
    // Keep real timing, but trim idle gaps (e.g. waiting on the network) to 5s.
    let remaining = Math.min(Math.max((next - index[i].t) * 1000, 0), 5000);
    while (remaining > 0) { await sleep(Math.min(remaining, 100)); ctx.drawImage(img, 0, 0, width, height); remaining -= 100; }
    if (i % 200 === 0) document.title = "encoding " + i + "/" + index.length;
  }
  await new Promise((r) => { rec.onstop = r; rec.stop(); });
  await uploads;
  await fetch("/done", { method: "POST" });
  return mime;
}
</script></body></html>`;

(async () => {
  fs.rmSync(outFile, { force: true });
  let done;
  const finished = new Promise((r) => (done = r));
  const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/chunk") {
      const parts = [];
      req.on("data", (d) => parts.push(d));
      req.on("end", () => { fs.appendFileSync(outFile, Buffer.concat(parts)); res.end("ok"); });
      return;
    }
    if (req.method === "POST" && req.url === "/done") { res.end("ok"); done(); return; }
    if (req.url === "/" ) { res.setHeader("Content-Type", "text/html"); res.end(PAGE); return; }
    const file = path.join(framesDir, path.basename(req.url));
    if (!fs.existsSync(file)) { res.statusCode = 404; res.end(); return; }
    res.setHeader("Content-Type", file.endsWith(".json") ? "application/json" : "image/jpeg");
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;

  const probe = fs.readFileSync(path.join(framesDir, index[0].file));
  // JPEG SOF0/SOF2 dimensions
  let w = 1366, h = 768;
  for (let i = 2; i < probe.length - 9; i++) if (probe[i] === 0xff && (probe[i + 1] === 0xc0 || probe[i + 1] === 0xc2)) { h = probe.readUInt16BE(i + 5); w = probe.readUInt16BE(i + 7); break; }

  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/`);
  const mime = await page.evaluate(([ww, hh]) => run(ww, hh), [w, h]);
  await finished;
  await browser.close();
  server.close();
  const seconds = (index[index.length - 1].t - index[0].t).toFixed(0);
  console.log(`ENCODED ${outFile} ${(fs.statSync(outFile).size / 1e6).toFixed(1)} MB, ${index.length} frames, ~${seconds}s source, ${w}x${h}, ${mime}`);
})().catch((e) => { console.error("ENCODE FAILED:", e.message); process.exit(1); });
