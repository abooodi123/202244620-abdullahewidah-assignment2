// Drives the project explorer like a visitor would and prints what it sees.
const puppeteer = require("puppeteer-core");
const { CHROME_PATH } = require("./config");
const SITE = process.argv[2];
const OUT = process.argv[3] || ".";

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(SITE, { waitUntil: "networkidle0" });

  const visible = () => page.$$eval(".project-card", (cards) => cards.filter((c) => !c.hidden).map((c) => c.querySelector("h3").textContent));
  const summary = () => page.$eval("#project-count", (el) => el.textContent);
  const chips = () => page.$$eval(".chip", (cs) => cs.map((c) => `${c.dataset.filter}:${c.querySelector(".chip-count").textContent}:${c.getAttribute("aria-pressed")}`).join(" "));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const check = (label, cond) => console.log(`${cond ? "PASS" : "FAIL"} ${label}`);

  check("toolbar visible", await page.$eval("#project-toolbar", (el) => !el.hidden));
  check("initial shows 4", (await visible()).length === 4);
  console.log("  ", await summary(), "|", await chips());

  await page.keyboard.press("/");
  check("'/' focuses search", await page.evaluate(() => document.activeElement.id === "project-search"));
  await page.keyboard.type("esp32");
  await wait(300);
  console.log("  esp32 ->", await visible(), "|", await summary(), "|", await chips());
  check("esp32 finds gesture project only", JSON.stringify(await visible()) === JSON.stringify(["Gesture-Controlled IoT System"]));
  check("url has q", (await page.url()).includes("q=esp32"));

  await page.keyboard.press("Escape");
  await wait(200);
  check("Escape clears search", (await visible()).length === 4);

  await page.click('[data-filter="web"]');
  check("web filter -> 1", (await visible()).length === 1);
  await page.type("#project-search", "python");
  await wait(300);
  check("empty state shows", await page.$eval("#project-empty", (el) => !el.hidden));
  console.log("  empty text:", await page.$eval("#project-empty-text", (el) => el.textContent));
  await page.screenshot({ path: `${OUT}/proj-empty.png`, clip: { x: 0, y: 0, width: 1280, height: 900 }, captureBeyondViewport: false });
  await page.click("#project-reset");
  await wait(200);
  check("reset restores 4", (await visible()).length === 4 && (await page.$eval("#project-empty", (el) => el.hidden)));

  await page.select("#project-sort", "name");
  await wait(100);
  console.log("  sorted by name:", await visible());
  await page.select("#project-sort", "status");
  await wait(100);
  console.log("  in progress first:", await visible());

  await page.click("#project-yolo .details-toggle");
  await wait(500);
  const det = await page.$eval("#details-yolo", (el) => ({ open: el.classList.contains("is-open"), h: el.getBoundingClientRect().height, vis: getComputedStyle(el).visibility }));
  const label = await page.$eval("#project-yolo .details-toggle", (b) => b.textContent.trim() + " / " + b.getAttribute("aria-expanded"));
  check(`details open (height ${det.h}, ${det.vis}, ${label})`, det.open && det.h > 50 && det.vis === "visible");
  const closed = await page.$eval("#details-twin", (el) => ({ h: el.getBoundingClientRect().height, vis: getComputedStyle(el).visibility }));
  check(`other details collapsed (height ${closed.h}, ${closed.vis})`, closed.h === 0 && closed.vis === "hidden");
  await page.evaluate(() => document.querySelector("#projects").scrollIntoView());
  await wait(300);
  await page.screenshot({ path: `${OUT}/proj-open.png` });

  // Deep link restores state.
  await page.goto(SITE + "?area=iot&q=mqtt", { waitUntil: "networkidle0" });
  check("deep link restores filter", JSON.stringify(await visible()) === JSON.stringify(["Gesture-Controlled IoT System"]) && (await page.$eval("#project-search", (i) => i.value)) === "mqtt");

  console.log("errors:", errors);
  await browser.close();
})();
