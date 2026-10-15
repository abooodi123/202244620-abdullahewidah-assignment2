// Tabs through the whole page with the keyboard only, at desktop and phone
// widths, and checks every stop is on screen and shows a focus indicator.
const puppeteer = require("puppeteer-core");
const { CHROME_PATH } = require("./config");
const SITE = process.argv[2];
const check = (label, cond) => console.log(`${cond ? "PASS" : "FAIL"} ${label}`);

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true });
  for (const width of [1280, 390]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.goto(SITE, { waitUntil: "networkidle0" });
    // Load the GitHub cards so their links are part of the tab order too.
    await page.evaluate(() => document.querySelector("#github").scrollIntoView());
    await page.waitForSelector("#repo-grid .repo-card:not(.is-skeleton), .notice", { timeout: 15000 });
    // Reload (the API result is now cached) so tabbing starts from the very top.
    await page.goto(SITE, { waitUntil: "networkidle0" });

    const stops = [];
    for (let i = 0; i < 120; i += 1) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        // Repo cards draw the ring on the card (via :focus-within), not the link.
        const ringHost = el.closest(".repo-card") || el;
        const ringStyle = getComputedStyle(ringHost);
        const switchTrack = el.matches(".switch input") ? getComputedStyle(el.nextElementSibling) : null;
        const hasRing = [ringStyle, switchTrack].some((s) => s && s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || style.boxShadow !== "none";
        const label = (el.getAttribute("aria-label") || el.textContent || el.id || el.tagName).trim().replace(/\s+/g, " ").slice(0, 30);
        return { label, onScreen: rect.bottom > 0 && rect.top < innerHeight && rect.width > 0, hasRing, visible: style.visibility !== "hidden" };
      });
      if (!info) break;
      if (stops.length && stops[0].label === info.label && stops.length > 5) break; // wrapped around
      stops.push(info);
    }
    const bad = stops.filter((s) => !s.onScreen || !s.hasRing || !s.visible);
    console.log(`  [${width}] ${stops.length} focus stops: ${stops.map((s) => s.label).join(" | ")}`);
    check(`[${width}] every focus stop is visible with a focus ring`, stops.length > 20 && bad.length === 0);
    if (bad.length) console.log("   problems:", bad);
    await page.close();
  }
  await browser.close();
})();
