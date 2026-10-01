// Records a narrated walkthrough of Civitness's citizen-report → fraud-flag flow.
// Run: node record-demo.js  (stack must be running on :5173 / :5174 / :8000)
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { startScreencast } = require("./screencast");

const PORTAL = "http://localhost:5174";
const STAFF = "http://localhost:5173";
const PASSWORD = "Password123!"; // seed demo accounts (README)
const OUT_DIR = path.join(__dirname, "video");
const VIEWPORT = { width: 1366, height: 768 };
const TOTAL_STEPS = 7;

// Fake cursor + caption layer, injected into every page.
const OVERLAY = () => {
  const install = () => {
    if (document.getElementById("__demo_cursor")) return;
    const style = document.createElement("style");
    style.textContent = `
      #__demo_cursor { position: fixed; z-index: 2147483647; pointer-events: none; width: 22px; height: 22px;
        margin: -3px 0 0 -3px; transition: transform .08s; }
      #__demo_cursor.down { transform: scale(.8); }
      #__demo_ring { position: fixed; z-index: 2147483646; pointer-events: none; width: 34px; height: 34px;
        margin: -17px 0 0 -17px; border-radius: 50%; border: 3px solid rgba(249,115,22,.9); opacity: 0; }
      #__demo_ring.pulse { animation: __ring .45s ease-out; }
      @keyframes __ring { from { opacity: 1; transform: scale(.4); } to { opacity: 0; transform: scale(1.4); } }
      #__demo_caption { position: fixed; z-index: 2147483645; left: 50%; bottom: 28px; transform: translateX(-50%);
        max-width: 880px; background: rgba(15,23,42,.93); color: #fff; border-radius: 14px; padding: 14px 22px;
        font: 500 17px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,.35);
        opacity: 0; transition: opacity .35s; }
      #__demo_caption.show { opacity: 1; }
      #__demo_caption .step { display: inline-block; margin-right: 10px; padding: 2px 9px; border-radius: 999px;
        background: #0F9C92; font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; vertical-align: 2px; }
      #__demo_caption .title { font-weight: 700; }
      #__demo_caption .sub { display: block; margin-top: 3px; color: #cbd5e1; font-size: 15px; }`;
    document.head.appendChild(style);
    const cursor = document.createElement("div");
    cursor.id = "__demo_cursor";
    cursor.innerHTML = `<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2l14 8-6 1.6L8 18z" fill="#0f172a" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    const ring = document.createElement("div");
    ring.id = "__demo_ring";
    document.body.append(cursor, ring);
    window.addEventListener("mousemove", (e) => { cursor.style.left = `${e.clientX}px`; cursor.style.top = `${e.clientY}px`; }, true);
    window.addEventListener("mousedown", (e) => {
      cursor.classList.add("down");
      ring.style.left = `${e.clientX}px`; ring.style.top = `${e.clientY}px`;
      ring.classList.remove("pulse"); void ring.offsetWidth; ring.classList.add("pulse");
    }, true);
    window.addEventListener("mouseup", () => cursor.classList.remove("down"), true);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let mouse = { x: VIEWPORT.width / 2, y: VIEWPORT.height / 2 };

async function caption(page, { step, title, sub, hold = 2600 }) {
  await page.evaluate(({ step, title, sub, total }) => {
    let el = document.getElementById("__demo_caption");
    if (!el) { el = document.createElement("div"); el.id = "__demo_caption"; document.body.appendChild(el); }
    el.innerHTML = `${step ? `<span class="step">Step ${step} / ${total}</span>` : ""}<span class="title">${title}</span>${sub ? `<span class="sub">${sub}</span>` : ""}`;
    requestAnimationFrame(() => el.classList.add("show"));
  }, { step, title, sub, total: TOTAL_STEPS });
  await sleep(hold);
}

async function hideCaption(page) {
  await page.evaluate(() => document.getElementById("__demo_caption")?.classList.remove("show"));
  await sleep(300);
}

async function moveTo(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  await sleep(250);
  const box = await locator.boundingBox();
  if (!box) throw new Error("element not visible");
  const target = { x: box.x + box.width / 2, y: box.y + Math.min(box.height / 2, 22) };
  await page.mouse.move(target.x, target.y, { steps: 25 });
  mouse = target;
  await sleep(200);
}

async function click(page, locator, pause = 700) {
  // Animate the cursor for the video, then let Playwright click: it re-measures the
  // element and waits for it to be stable, so a still-running smooth scroll can't
  // make the click miss.
  await moveTo(page, locator);
  await locator.click();
  await sleep(pause);
}

async function type(page, locator, text, delay = 38) {
  await click(page, locator, 250);
  await locator.pressSequentially(text, { delay });
  await sleep(400);
}

async function scrollTo(page, locator) {
  await locator.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
  // Wait until the smooth scroll has actually settled.
  let last = -1;
  for (let i = 0; i < 30; i++) {
    await sleep(120);
    const y = await page.evaluate(() => window.scrollY);
    if (y === last) break;
    last = y;
  }
  await sleep(400);
}

async function login(page, email) {
  await page.goto(`${STAFF}/login`);
  await page.getByPlaceholder("name@agency.gov").waitFor();
  await type(page, page.getByPlaceholder("name@agency.gov"), email, 30);
  await type(page, page.getByPlaceholder("Enter password"), PASSWORD, 45);
  await click(page, page.getByRole("button", { name: "Sign In", exact: true }), 300);
  await page.waitForURL("**/dashboard");
  await sleep(1800);
}

async function logout(page) {
  await click(page, page.getByRole("button", { name: "Logout" }));
  await page.waitForURL("**/login");
}

async function openRiskTab(page) {
  await page.goto(`${STAFF}/projects/1`);
  const tab = page.getByRole("button", { name: "Risk & Flags" });
  await tab.waitFor();
  await sleep(1200);
  await click(page, tab, 1200);
}

async function makeSitePhoto(page, file) {
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement("canvas"); c.width = 1200; c.height = 800;
    const g = c.getContext("2d");
    const sky = g.createLinearGradient(0, 0, 0, 420); sky.addColorStop(0, "#9ec5e8"); sky.addColorStop(1, "#dbe9f5");
    g.fillStyle = sky; g.fillRect(0, 0, 1200, 420);
    g.fillStyle = "#8a7457"; g.fillRect(0, 420, 1200, 380);                    // bare earth
    g.fillStyle = "#5b7fa6"; g.fillRect(140, 560, 900, 70);                     // flooded trench
    g.fillStyle = "#6b6f75"; for (let x = 60; x < 1200; x += 90) g.fillRect(x, 300, 10, 140); // fence posts
    g.strokeStyle = "#6b6f75"; g.lineWidth = 3; for (const y of [320, 360, 400]) { g.beginPath(); g.moveTo(0, y); g.lineTo(1200, y); g.stroke(); }
    g.fillStyle = "#b91c1c"; g.fillRect(520, 330, 160, 90); g.fillStyle = "#fff"; g.font = "bold 26px sans-serif"; g.fillText("CLOSED", 548, 386);
    return c.toDataURL("image/jpeg", 0.9);
  });
  fs.writeFileSync(file, Buffer.from(dataUrl.split(",")[1], "base64"));
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  await context.addInitScript(OVERLAY);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const FRAMES = path.join(__dirname, "frames");
  const stopCapture = await startScreencast(context, page, FRAMES, VIEWPORT);

  // ── Intro ────────────────────────────────────────────────────────────────
  await page.goto(PORTAL);
  await page.getByText("Find the project").waitFor();
  await page.mouse.move(mouse.x, mouse.y);
  await caption(page, { title: "Civitness — citizen reporting that can stop payment for unfinished work",
    sub: "Walkthrough: a citizen reports a stalled site → staff verify → payment is blocked → resolved with two-person sign-off.", hold: 4200 });
  await hideCaption(page);

  // ── 1. Citizen reports ──────────────────────────────────────────────────
  await caption(page, { step: 1, title: "A citizen finds the project — no account, no app install",
    sub: "Search by name, town, or the code on the site signboard.", hold: 2400 });
  await type(page, page.locator('input[type="search"]'), "health centre", 70);
  await sleep(1200);
  await click(page, page.locator('a[href="/report/1"]'), 1400);
  await hideCaption(page);

  await caption(page, { step: 1, title: "They say what they saw…", sub: "Plain-language categories, including positive progress updates.", hold: 1800 });
  await click(page, page.locator("label").filter({ hasText: "No work happening" }), 700);
  await type(page, page.locator("textarea"),
    "The site gate has been locked for three weeks. No workers or machines, and the foundation trenches are filling with rainwater.", 22);
  const photo = path.join(__dirname, "site-photo.jpg");
  await makeSitePhoto(page, photo);
  await scrollTo(page, page.getByText("Take or choose a photo"));
  await moveTo(page, page.getByText("Take or choose a photo"));
  await page.locator('input[type="file"]').setInputFiles(photo);
  await sleep(900);
  await caption(page, { step: 1, title: "…and can attach a photo",
    sub: "Location and camera details are stripped from the photo before it is stored.", hold: 2600 });
  await hideCaption(page);
  await click(page, page.getByRole("button", { name: "Send anonymous report" }), 300);
  await page.getByText("Your report was sent").waitFor();
  const code = (await page.locator("main").innerText()).match(/CR-[A-Z0-9]{8}/)[0];
  await sleep(600);
  await caption(page, { step: 1, title: `Report sent. The citizen keeps this code: ${code}`,
    sub: "It's anonymous — the code is the only way back to the report. No name, phone or IP address is stored with it.", hold: 4000 });
  await hideCaption(page);

  // ── 2. Staff dashboard ──────────────────────────────────────────────────
  await login(page, "admin@civitness.local");
  const card = page.locator('main a[href="/citizen-reports"]');
  await scrollTo(page, card);
  await moveTo(page, card);
  await caption(page, { step: 2, title: "Monitoring staff see it on their dashboard",
    sub: "Open citizen reports sit alongside delayed milestones and fraud flags.", hold: 3000 });
  await hideCaption(page);
  await click(page, card, 1800);

  // ── 3. Triage and escalate ──────────────────────────────────────────────
  await caption(page, { step: 3, title: "The triage queue shows the report and the citizen's photo",
    sub: "Staff can mark it under review, request a field visit, resolve, dismiss — or escalate.", hold: 3000 });
  await hideCaption(page);
  await scrollTo(page, page.locator('main img[alt="Citizen-submitted site photo"]'));
  await sleep(1200);
  await type(page, page.getByPlaceholder("What did you verify?", { exact: false }),
    "Field officer visited: site locked, no activity for 3 weeks despite the tranche 1 schedule.", 20);
  await type(page, page.getByPlaceholder("e.g. Thank you. An officer will visit", { exact: false }),
    "Thank you. We confirmed the site is inactive and have opened an investigation.", 20);
  await caption(page, { step: 3, title: "After a site visit confirms it, staff escalate",
    sub: "Escalation creates a HIGH-severity fraud flag that blocks the contractor's next payment.", hold: 2600 });
  await click(page, page.getByRole("button", { name: "Escalate to fraud flag" }), 400);
  await page.getByText("Report escalated").waitFor();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(1400);
  await caption(page, { step: 3, title: "Escalated — tranche release is now blocked for this project", hold: 2600 });
  await hideCaption(page);

  // ── 4. Project view ─────────────────────────────────────────────────────
  await openRiskTab(page);
  await scrollTo(page, page.getByRole("heading", { name: "Citizen Reports" }));
  await caption(page, { step: 4, title: "The project page shows the citizen signal and the open fraud flag",
    sub: "Several independent reporters automatically raise the project's risk level — one person can't game it.", hold: 3600 });
  await hideCaption(page);

  // ── 5. Four-eyes rule ───────────────────────────────────────────────────
  const resolveBtn = page.getByRole("button", { name: "Resolve", exact: true });
  await scrollTo(page, resolveBtn);
  await click(page, resolveBtn, 700);
  await type(page, page.getByPlaceholder("What did the investigation find?", { exact: false }),
    "Clearing this myself.", 30);
  await click(page, page.locator("button", { hasText: "Resolved: issue remediated" }), 400);
  await page.getByText("must be resolved by someone other").waitFor();
  await sleep(500);
  await caption(page, { step: 5, title: "Two-person rule: whoever raised a flag can't clear it",
    sub: "Clearing a payment block needs a second reviewer — and every decision is written to the audit trail.", hold: 4000 });
  await hideCaption(page);
  await click(page, page.locator("button", { hasText: "Cancel" }).last(), 500);

  // ── 6. Second reviewer resolves ─────────────────────────────────────────
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(900);
  await logout(page);
  await caption(page, { step: 6, title: "A separate QA reviewer signs in", hold: 1800 });
  await hideCaption(page);
  await login(page, "qa@civitness.local");
  await openRiskTab(page);
  const resolveBtn2 = page.getByRole("button", { name: "Resolve", exact: true });
  await scrollTo(page, resolveBtn2);
  await click(page, resolveBtn2, 700);
  await type(page, page.getByPlaceholder("What did the investigation find?", { exact: false }),
    "Contractor remobilised and pumped the trenches; verified on a second site visit.", 20);
  await click(page, page.locator("button", { hasText: "Resolved: issue remediated" }), 400);
  await page.getByText("Contractor remobilised and pumped the trenches", { exact: false }).first().waitFor();
  await sleep(700);
  await caption(page, { step: 6, title: "Resolved by the second reviewer — the payment block is lifted",
    sub: "The milestone goes back for fresh evidence, which must still pass QA before any money moves.", hold: 3800 });
  await hideCaption(page);

  // ── 7. Citizen sees the outcome ─────────────────────────────────────────
  await page.goto(`${PORTAL}/track`);
  await page.getByText("Track your report").waitFor();
  await type(page, page.getByPlaceholder("CR-XXXXXXXX"), code, 80);
  await click(page, page.getByRole("button", { name: "Check", exact: true }), 300);
  await page.getByText("Response from the team").waitFor();
  await sleep(700);
  await caption(page, { step: 7, title: "The citizen checks back with their code and sees the outcome",
    sub: "Including the team's reply — without ever identifying themselves.", hold: 4200 });
  await hideCaption(page);

  // ── Outro ───────────────────────────────────────────────────────────────
  await caption(page, { title: "Civitness: no verified work → no approval → no payment",
    sub: "Citizens add eyes on the ground; staff keep control; every step is audited.", hold: 4200 });

  const frameCount = await stopCapture();
  await context.close();
  await browser.close();
  console.log("CAPTURED", frameCount, "frames; report code", code);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const final = path.join(OUT_DIR, "civitness-citizen-report-demo.webm");
  execFileSync(process.execPath, [path.join(__dirname, "encode.js"), FRAMES, final], { stdio: "inherit" });
  console.log("DONE", final);
})().catch((err) => { console.error("FAILED:", err.message); process.exit(1); });
