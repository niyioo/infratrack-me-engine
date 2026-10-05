// Records the staff-side ProveTrack walkthrough: triage, portfolio map, project
// report, QA pass mark and the finance release check. Nothing is approved,
// released or changed, so the demo data stays reusable.
// Run: node record-showcase.js <out.mp4>   (stack running on :5173 / :8000;
// see README for the data it expects)
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { startScreencast } = require("./screencast");
const { OVERLAY, sleep, caption: captionStep, hideCaption, moveTo, click, login: loginAs, logout } = require("./lib");

const STAFF = "http://localhost:5173";
const API = "http://localhost:8000/api";
const PASSWORD = "Password123!"; // seed demo accounts (README)
const VIEWPORT = { width: 1600, height: 900 };
const TOTAL_STEPS = 5;
const outFile = path.resolve(process.argv[2] || path.join(__dirname, "video", "provetrack-staff.mp4"));

const caption = (page, opts) => captionStep(page, { total: TOTAL_STEPS, ...opts });
const login = (page, email) => loginAs(page, STAFF, email, PASSWORD);

async function projectId(code) {
  const token = await fetch(`${API}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@provetrack.local", password: PASSWORD }),
  }).then((r) => r.json()).then((d) => d.access);
  const data = await fetch(`${API}/projects/?search=${code}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
  const rows = Array.isArray(data) ? data : data.results;
  return rows.find((p) => p.project_code === code).id;
}

// Full-screen brand card, drawn by the page itself so it's captured like any frame.
async function titleCard(page, { eyebrow, title, sub, hold }) {
  await page.setContent(`<!doctype html><html><body style="margin:0;height:100vh;display:flex;align-items:center;
    background:linear-gradient(135deg,#0B1220,#13233F);font-family:'Segoe UI',system-ui,sans-serif;color:#fff">
    <div style="padding:0 140px">
      <div style="font:700 22px/1 'Segoe UI';letter-spacing:.14em;color:#14B8A6;text-transform:uppercase">${eyebrow}</div>
      <div style="margin-top:26px;font:800 92px/1 'Segoe UI';letter-spacing:-.03em"><span>Prove</span><span style="color:#14B8A6">Track</span></div>
      <div style="margin-top:22px;font:600 34px/1.3 'Segoe UI';color:#E2E8F0">${title}</div>
      <div style="margin-top:20px;font:400 26px/1.45 'Segoe UI';color:#94A3B8;max-width:1100px">${sub}</div>
    </div></body></html>`);
  await sleep(hold);
}

(async () => {
  const rivers = await projectId("INF-RIV-0005");

  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT, acceptDownloads: true });
  await context.addInitScript(OVERLAY);
  // Larger captions: this video is watched full-screen, often on a phone.
  await context.addInitScript(() => {
    const css = "#__demo_caption{font-size:22px!important;max-width:1180px!important;padding:18px 28px!important}"
      + "#__demo_caption .sub{font-size:19px!important}#__demo_caption .step{font-size:14px!important}";
    const add = () => { const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add); else add();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const FRAMES = path.join(__dirname, "frames-staff");
  const stopCapture = await startScreencast(context, page, FRAMES, VIEWPORT);

  // ── 1. Triage ───────────────────────────────────────────────────────────
  await login(page, "admin@provetrack.local");
  await page.goto(`${STAFF}/citizen-reports`);
  const report = page.locator("main button").filter({ hasText: "Ikorodu" }).first();
  await report.waitFor();
  await sleep(1200);
  await click(page, report, 1500);
  await caption(page, { step: 1, title: "The citizen's report lands in the staff triage queue",
    sub: "Staff review it, request a field visit, reply to the citizen, or escalate it to block payment.", hold: 4200 });
  await hideCaption(page);

  // ── 2. Portfolio map ────────────────────────────────────────────────────
  await page.goto(`${STAFF}/map`);
  await page.locator(".leaflet-container").waitFor();
  await sleep(3500); // let tiles load
  await caption(page, { step: 2, title: "The portfolio map: every project, coloured by health",
    sub: "Health compares progress with the plan, so a project that hasn't started isn't marked behind.", hold: 4000 });
  await click(page, page.getByRole("button", { name: "Status", exact: true }), 1800);
  await click(page, page.getByRole("button", { name: "Health", exact: true }), 1200);
  await hideCaption(page);
  await click(page, page.locator("aside, main").getByRole("button").filter({ hasText: "Rumuokoro Health Post" }).first(), 3200);
  await caption(page, { step: 2, title: "Lowest health first, with citizen reports pinned where they were made",
    sub: "Triage staff see report locations; reporters are never identified.", hold: 4200 });
  await hideCaption(page);

  // ── 3. Project report ───────────────────────────────────────────────────
  await page.goto(`${STAFF}/projects/${rivers}`);
  const reportBtn = page.getByRole("button", { name: /Download report/ });
  await reportBtn.waitFor();
  await sleep(1500);
  await caption(page, { step: 3, title: "Each project has a one-click report for funders and auditors",
    sub: "Finance, milestones, field evidence, QA decisions, integrity flags and citizen signals.", hold: 3200 });
  const download = page.waitForEvent("download");
  await click(page, reportBtn, 300);
  await download;
  await page.getByText(/Fingerprint [0-9a-f]{6}/).waitFor();
  await sleep(800);
  await caption(page, { step: 3, title: "Every PDF carries a SHA-256 fingerprint",
    sub: "Two copies with the same fingerprint describe exactly the same project state.", hold: 3800 });
  await hideCaption(page);

  // ── 4. QA pass mark ─────────────────────────────────────────────────────
  await logout(page);
  await login(page, "qa@provetrack.local");
  await page.goto(`${STAFF}/milestones/review`);
  const passMark = page.getByText(/pass mark \d+\/\d+/).first();
  await passMark.waitFor();
  await sleep(1200);
  await moveTo(page, passMark);
  await caption(page, { step: 4, title: "QA reviewers score geo-verified evidence against a checklist",
    sub: "Each required item must reach the milestone's pass mark before it can be approved.", hold: 4400 });
  await hideCaption(page);

  // ── 5. Finance release check ────────────────────────────────────────────
  await logout(page);
  await login(page, "finance@provetrack.local");
  await page.goto(`${STAFF}/finance/queue`);
  const tranche = page.locator("main button").filter({ hasText: "INF-OND-0001" }).first();
  await tranche.waitFor();
  await click(page, tranche, 1200);
  await click(page, page.getByRole("button", { name: "Run Check" }), 300);
  await page.getByText(/All rules passed/).waitFor();
  await sleep(900);
  await moveTo(page, page.getByText(/All rules passed/));
  await caption(page, { step: 5, title: "Money moves only when every rule passes",
    sub: "Approved milestone, verified evidence, independent validation, no open fraud flags.", hold: 4600 });
  await hideCaption(page);

  // ── Outro ───────────────────────────────────────────────────────────────
  await titleCard(page, { eyebrow: "Report → Verify → Evidence → Track → Resolve",
    title: "Field Intelligence &amp; Accountability Platform",
    sub: "Track Progress. Prove Delivery.", hold: 5000 });

  const frameCount = await stopCapture();
  await context.close();
  await browser.close();
  console.log("CAPTURED", frameCount, "frames");
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  execFileSync(process.execPath, [path.join(__dirname, "encode.js"), FRAMES, outFile], { stdio: "inherit" });
  console.log("DONE", outFile);
})().catch((err) => { console.error("FAILED:", err.message); process.exit(1); });
