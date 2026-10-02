// Frame capture via the DevTools screencast (no ffmpeg needed).
const fs = require("fs");
const path = require("path");

async function startScreencast(context, page, framesDir, { width, height }) {
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
  const index = [];
  let seq = 0;
  let stopped = false;
  const cdp = await context.newCDPSession(page);

  let lastFrameAt = Date.now();
  cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    lastFrameAt = Date.now();
    const file = `f_${String(seq++).padStart(6, "0")}.jpg`;
    fs.writeFileSync(path.join(framesDir, file), Buffer.from(data, "base64"));
    index.push({ file, t: metadata.timestamp });
    try { await cdp.send("Page.screencastFrameAck", { sessionId }); } catch { /* page navigating */ }
  });

  const start = () =>
    cdp.send("Page.startScreencast", { format: "jpeg", quality: 82, maxWidth: width, maxHeight: height, everyNthFrame: 1 })
      .catch(() => {});
  await start();
  // Cross-origin navigations can swap renderer processes; restart to keep frames flowing.
  page.on("load", () => { if (!stopped) start(); });
  // The screencast can silently stop after some navigations. Static pages also
  // send no frames, so restarting whenever none have arrived for a while is
  // harmless: it just yields a fresh frame.
  const watchdog = setInterval(async () => {
    if (stopped || Date.now() - lastFrameAt < 1500) return;
    lastFrameAt = Date.now();
    try { await cdp.send("Page.stopScreencast"); } catch { /* not running */ }
    start();
  }, 750);

  return async function stop() {
    stopped = true;
    clearInterval(watchdog);
    try { await cdp.send("Page.stopScreencast"); } catch { /* ignore */ }
    fs.writeFileSync(path.join(framesDir, "frames.json"), JSON.stringify(index));
    return index.length;
  };
}

module.exports = { startScreencast };
