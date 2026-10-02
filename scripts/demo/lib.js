// Shared helpers for the scripted demo recordings: a visible fake cursor,
// on-screen captions, and human-paced clicking/typing/scrolling.
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
let mouse = { x: 683, y: 384 };

async function caption(page, { step, total, title, sub, hold = 2600 }) {
  await page.evaluate(({ step, title, sub, total }) => {
    let el = document.getElementById("__demo_caption");
    if (!el) { el = document.createElement("div"); el.id = "__demo_caption"; document.body.appendChild(el); }
    el.innerHTML = `${step ? `<span class="step">Step ${step} / ${total}</span>` : ""}<span class="title">${title}</span>${sub ? `<span class="sub">${sub}</span>` : ""}`;
    requestAnimationFrame(() => el.classList.add("show"));
  }, { step, title, sub, total });
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

async function login(page, staffUrl, email, password) {
  await page.goto(`${staffUrl}/login`);
  await page.getByPlaceholder("name@agency.gov").waitFor();
  await type(page, page.getByPlaceholder("name@agency.gov"), email, 30);
  await type(page, page.getByPlaceholder("Enter password"), password, 45);
  await click(page, page.getByRole("button", { name: "Sign In", exact: true }), 300);
  await page.waitForURL("**/dashboard");
  await sleep(1800);
}

async function logout(page) {
  await click(page, page.getByRole("button", { name: "Logout" }));
  await page.waitForURL("**/login");
}


module.exports = { OVERLAY, sleep, caption, hideCaption, moveTo, click, type, scrollTo, login, logout };
