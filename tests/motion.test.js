// With full motion on: scroll the page and make sure nothing stays invisible,
// the header shadow and back-to-top button react, and the theme toggle works.
const puppeteer = require("puppeteer-core");
const { CHROME_PATH } = require("./config");
const SITE = process.argv[2];
const OUT = process.argv[3] || ".";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (label, cond) => console.log(`${cond ? "PASS" : "FAIL"} ${label}`);

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true });
  for (const width of [1280, 390]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.setViewport({ width, height: 850 });
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }, { name: "prefers-reduced-motion", value: "no-preference" }]);
    await page.goto(SITE, { waitUntil: "networkidle0" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle0" });

    const reveals = await page.$$eval(".reveal", (els) => els.length);
    check(`[${width}] reveal targets registered (${reveals})`, reveals >= 8);
    check(`[${width}] back-to-top hidden at top`, !(await page.$eval("#back-to-top", (b) => b.classList.contains("is-visible"))));

    // Scroll slowly through the page like a reader.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y <= height; y += 400) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await wait(120);
    }
    await wait(1200);
    const stuck = await page.$$eval(".reveal", (els) => els.filter((e) => !e.classList.contains("is-visible")).map((e) => e.className));
    check(`[${width}] every revealed block became visible`, stuck.length === 0);
    if (stuck.length) console.log("   stuck:", stuck);
    check(`[${width}] header shadow after scroll`, await page.$eval("#site-header", (h) => h.classList.contains("is-scrolled")));
    check(`[${width}] back-to-top visible after scroll`, await page.$eval("#back-to-top", (b) => b.classList.contains("is-visible")));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`[${width}] no horizontal overflow (${overflow}px)`, overflow <= 0);

    await page.click("#back-to-top");
    await wait(1500);
    check(`[${width}] back-to-top returns to top (y=${await page.evaluate(() => scrollY)})`, (await page.evaluate(() => scrollY)) < 5);

    // Theme toggle + persistence.
    await page.click("#theme-toggle");
    await wait(500);
    const theme = await page.evaluate(() => [document.documentElement.dataset.theme, localStorage.getItem("portfolio-theme"), document.querySelector('meta[name="theme-color"]').content, document.querySelector("#theme-toggle").getAttribute("aria-label")]);
    console.log("   theme after click:", theme);
    await page.reload({ waitUntil: "networkidle0" });
    check(`[${width}] theme persists after reload`, (await page.evaluate(() => document.documentElement.dataset.theme)) === "dark");

    if (width === 390) {
      await page.click("#menu-toggle");
      await wait(350);
      const menu = await page.evaluate(() => ({ open: document.querySelector("#site-nav").classList.contains("is-open"), expanded: document.querySelector("#menu-toggle").getAttribute("aria-expanded"), visible: getComputedStyle(document.querySelector("#site-nav")).visibility }));
      check(`mobile menu opens (${JSON.stringify(menu)})`, menu.open && menu.expanded === "true" && menu.visible === "visible");
      await page.screenshot({ path: `${OUT}/mobile-menu-dark.png` });
      await page.keyboard.press("Escape");
      await wait(350);
      check("Escape closes menu and returns focus", (await page.evaluate(() => !document.querySelector("#site-nav").classList.contains("is-open") && document.activeElement.id === "menu-toggle")));
      await page.click("#menu-toggle");
      await wait(300);
      await page.click('.nav-links a[href="#projects"]');
      await wait(1200);
      check("menu link navigates and closes menu", await page.evaluate(() => !document.querySelector("#site-nav").classList.contains("is-open") && location.hash === "#projects"));
    }
    console.log(`   errors: ${JSON.stringify(errors)}`);
    await page.close();
  }
  await browser.close();
})();
