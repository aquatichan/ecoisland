// Lists text in <main> that sits straight on the scene, or straight on a tray: text whose nearest painted
// ancestor below <main> is missing or is a tray (a tray is translucent, so only its own heading may sit on it),
// and that is not page-hero text inside the title haze. Also reports horizontal overflow.
//
// Usage: node design/scene-art/audit.mjs <user> <path...>
//   env PLAYWRIGHT  path to a Playwright install's index.mjs (default: the local node_modules)
//   env BASE        the running app (default http://localhost:5183), in emulator mode, seeded
//   env W           window width (default 1280)
const playwright = process.env.PLAYWRIGHT || "playwright/index.mjs";
const { chromium } = await import(playwright);
const [, , user, ...paths] = process.argv;
const base = process.env.BASE || "http://localhost:5183";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: +(process.env.W || 1280), height: 800 } })).newPage();
p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await p.goto(base + "/start");
await p.waitForFunction(() => typeof window.__ecoSignIn === "function");
await p.evaluate(([h, n]) => window.__ecoSignIn(h, n), [user, user[0].toUpperCase() + user.slice(1)]);
await p.waitForTimeout(2500);
let total = 0;
for (const path of paths) {
  await p.goto(base + path);
  await p.waitForLoadState("networkidle").catch(() => {});
  await p.waitForTimeout(1500);
  const out = await p.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return ["NO MAIN"];
    const res = [];
    const overflow = document.documentElement.scrollWidth - innerWidth;
    if (overflow > 0) res.push(`OVERFLOW-X ${overflow}px`);
    if (document.querySelector("[data-scene-tint]")) return res; // a reading page: one even tint over the whole scene
    const col = main.parentElement.getBoundingClientRect();
    const hazeX = col.left + col.width * 0.54;
    const hazeY = 26 * 16; // HAZE_MASK holds at full strength to 26rem
    const alpha = (el) => {
      const c = getComputedStyle(el).backgroundColor;
      if (c === "transparent") return 0;
      const m = /rgba?\(([^)]+)\)/.exec(c);
      if (m) {
        const parts = m[1].split(/[,/]/).map((x) => x.trim());
        return parts.length > 3 ? parseFloat(parts[3]) : 1;
      }
      return c.includes("/") ? parseFloat(c.split("/")[1]) : 1;
    };
    const seen = new Set();
    const w = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const t = n.textContent.trim();
      if (!t) continue;
      const el = n.parentElement;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      let host = null;
      for (let e = el; e && e !== main; e = e.parentElement) {
        if (e.classList.contains("tray")) { host = e; break; }
        if (alpha(e) >= 0.6 || getComputedStyle(e).backgroundImage !== "none") { host = e; break; }
      }
      if (host && !host.classList.contains("tray")) continue; // on a card, plate, chip or control
      if (host && el.closest(".tray-head")) continue; // a tray's own heading, in --fg
      const r = document.createRange();
      r.selectNodeContents(n);
      const box = r.getBoundingClientRect();
      if (!box.width) continue;
      const y = box.top + scrollY;
      if (!host && el.closest(".page-hero") && box.right <= hazeX && y + box.height <= hazeY) continue;
      const key = t.slice(0, 50);
      if (seen.has(key)) continue;
      seen.add(key);
      res.push(`${host ? "ON TRAY" : "ON SCENE"} ${Math.round(box.left)},${Math.round(y)} <${el.tagName.toLowerCase()}> ${t.slice(0, 60)}`);
    }
    return res;
  });
  total += out.length;
  console.log(`## ${path} (${out.length})`);
  for (const l of out.slice(0, 20)) console.log("  " + l);
}
console.log(`\n${total} finding(s)`);
await b.close();
