// Checks the greeting, the Dhahran clock, and keyboard/mouse use of the About tabs.
const puppeteer = require("puppeteer-core");
const { CHROME_PATH } = require("./config");
const SITE = process.argv[2];
const OUT = process.argv[3] || ".";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (label, cond) => console.log(`${cond ? "PASS" : "FAIL"} ${label}`);

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport({ width: 1280, height: 900 });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  await page.goto(SITE, { waitUntil: "networkidle0" });

  console.log("  eyebrow:", await page.$eval(".eyebrow", (e) => e.textContent.trim()));
  console.log("  local time:", await page.$eval("#local-time", (e) => e.textContent.trim()));
  check("greeting shown", await page.$eval("#greeting", (e) => !e.hidden && /Good|Hello/.test(e.textContent)));

  const visiblePanels = () => page.$$eval(".tab-panel", (ps) => ps.filter((p) => !p.hidden).map((p) => p.id));
  check("only overview visible at start", JSON.stringify(await visiblePanels()) === '["panel-overview"]');
  await page.click("#tab-skills");
  await wait(450);
  check("click Skills shows skills", JSON.stringify(await visiblePanels()) === '["panel-skills"]');
  await page.keyboard.press("ArrowRight");
  await wait(450);
  check("ArrowRight -> Education + focus", JSON.stringify(await visiblePanels()) === '["panel-education"]' && (await page.evaluate(() => document.activeElement.id)) === "tab-education");
  await page.keyboard.press("ArrowRight");
  check("ArrowRight wraps to Overview", JSON.stringify(await visiblePanels()) === '["panel-overview"]');
  await page.keyboard.press("End");
  check("End -> Education", JSON.stringify(await visiblePanels()) === '["panel-education"]');
  const tabindexes = await page.$$eval("[role=tab]", (ts) => ts.map((t) => t.tabIndex).join(","));
  check(`roving tabindex (${tabindexes})`, tabindexes === "-1,-1,0");
  await wait(450);
  check("indicator sits under the active tab", await page.evaluate(() => {
    const i = document.querySelector(".tab-indicator").getBoundingClientRect();
    const t = document.querySelector("#tab-education").getBoundingClientRect();
    return Math.abs(i.left - t.left) < 2 && Math.abs(i.width - t.width) < 2;
  }));
  await page.click("#tab-skills");
  await wait(500);
  await page.evaluate(() => document.querySelector("#about").scrollIntoView());
  await wait(300);
  await page.screenshot({ path: `${OUT}/about-skills.png` });
  await page.evaluate(() => scrollTo(0, 0));
  await wait(200);
  await page.screenshot({ path: `${OUT}/hero.png` });

  // No-JavaScript fallback: everything readable.
  const nojs = await browser.newPage();
  await nojs.setJavaScriptEnabled(false);
  await nojs.setViewport({ width: 1280, height: 900 });
  await nojs.goto(SITE, { waitUntil: "networkidle0" });
  const fallback = await nojs.evaluate(() => ({
    panels: [...document.querySelectorAll(".tab-panel")].filter((p) => p.offsetHeight > 0).length,
    cards: [...document.querySelectorAll(".project-card")].filter((p) => p.offsetHeight > 0).length,
    details: [...document.querySelectorAll(".project-details")].filter((p) => p.offsetHeight > 0).length,
    toolbarHidden: document.querySelector("#project-toolbar").hidden,
    noscript: !!document.querySelector("noscript"),
  }));
  console.log("  no-JS:", fallback);
  check("no-JS shows all content", fallback.panels === 3 && fallback.cards === 4 && fallback.details === 4 && fallback.toolbarHidden);

  console.log("errors:", errors);
  await browser.close();
})();
