// Exercises the GitHub section against the live API and simulated failures.
const puppeteer = require("puppeteer-core");
const { CHROME_PATH } = require("./config");
const SITE = process.argv[2];
const OUT = process.argv[3] || ".";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (label, cond) => console.log(`${cond ? "PASS" : "FAIL"} ${label}`);

async function openPage(browser, { mode = "live", clearStorage = true } = {}) {
  const page = await browser.newPage();
  const errors = [];
  let apiCalls = 0;
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport({ width: 1280, height: 900 });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (!req.url().startsWith("https://api.github.com")) return req.continue();
    apiCalls += 1;
    const headers = { "access-control-allow-origin": "*", "access-control-expose-headers": "x-ratelimit-remaining, x-ratelimit-reset" };
    if (mode === "live") return req.continue();
    if (mode === "ratelimit") return req.respond({ status: 403, headers: { ...headers, "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 1800) }, body: "{}" });
    if (mode === "500") return req.respond({ status: 500, headers, body: "{}" });
    if (mode === "network") return req.abort("failed");
    if (mode === "forks-only") return req.respond({ status: 200, headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify([{ name: "a-fork", html_url: "https://github.com/x/a-fork", fork: true, pushed_at: new Date().toISOString(), stargazers_count: 0 }]) });
    if (mode === "slow") return; // never answers -> timeout path
  });
  await page.goto(SITE + "#github", { waitUntil: "domcontentloaded" });
  if (clearStorage) await page.evaluate(() => localStorage.clear());
  return { page, errors, calls: () => apiCalls };
}

const repoNames = (page) => page.$$eval("#repo-grid .repo-card:not(.is-skeleton) h3", (h) => h.map((x) => x.textContent));
const statusText = (page) => page.$eval("#repo-status", (el) => el.textContent.trim());

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true });

  // 1. Live API
  let { page, errors, calls } = await openPage(browser);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.querySelector("#github").scrollIntoView());
  await wait(150);
  const skeletons = await page.$$eval(".repo-card.is-skeleton", (s) => s.length);
  const loadingMsg = await statusText(page);
  console.log("  while loading:", skeletons, "skeletons |", loadingMsg);
  await page.waitForSelector("#repo-grid .repo-card:not(.is-skeleton)", { timeout: 15000 });
  console.log("  live repos (forks hidden):", await repoNames(page));
  console.log("  updated:", await page.$eval("#repo-updated", (e) => e.textContent), "| announcer:", await page.$eval("#repo-announcer", (e) => e.textContent));
  check("live load renders repos", (await repoNames(page)).length > 0);
  await page.click(".switch");
  await wait(200);
  const withForks = await repoNames(page);
  console.log("  with forks:", withForks, "| more button:", await page.$eval("#repo-more", (b) => (b.hidden ? "hidden" : b.textContent)));
  check("forks pref saved", (await page.evaluate(() => localStorage.getItem("portfolio-github-forks"))) === "true");
  const moreHidden = await page.$eval("#repo-more", (b) => b.hidden);
  if (!moreHidden) {
    await page.click("#repo-more");
    await wait(200);
    check(`show all expands (${(await repoNames(page)).length})`, (await repoNames(page)).length === withForks.length || (await repoNames(page)).length > 6);
    console.log("  focus after expand:", await page.evaluate(() => document.activeElement.textContent));
  }
  await page.evaluate(() => document.querySelector("#github").scrollIntoView());
  await wait(400);
  await page.screenshot({ path: `${OUT}/gh-live.png` });
  // Reload: should use cache, no new API call.
  const before = calls();
  await page.reload({ waitUntil: "networkidle0" });
  await page.evaluate(() => document.querySelector("#github").scrollIntoView());
  await wait(500);
  check(`cache reused on reload (calls ${before} -> ${calls()})`, calls() === before && (await repoNames(page)).length > 0);
  check("forks toggle restored from storage", await page.$eval("#repo-forks", (i) => i.checked));
  console.log("  errors:", errors);
  await page.close();

  // 2. Failure modes without cache
  for (const mode of ["ratelimit", "500", "network"]) {
    ({ page, errors } = await openPage(browser, { mode }));
    await page.reload({ waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.querySelector("#github").scrollIntoView());
    await page.waitForSelector(".notice-error", { timeout: 15000 });
    console.log(`  [${mode}]`, await statusText(page));
    check(`${mode}: retry button present`, (await page.$$(".notice-error button")).length === 1);
    if (mode === "ratelimit") {
      await page.evaluate(() => document.querySelector("#github").scrollIntoView());
      await wait(400);
      await page.screenshot({ path: `${OUT}/gh-error.png` });
    }
    await page.close();
  }

  // 3. Empty state: only forks exist
  ({ page } = await openPage(browser, { mode: "forks-only" }));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.querySelector("#github").scrollIntoView());
  await page.waitForSelector(".notice-info", { timeout: 15000 });
  console.log("  [forks-only]", await statusText(page));
  await page.click(".notice-info button");
  await wait(200);
  check("empty-state button reveals forks", (await repoNames(page)).join() === "a-fork");
  await page.close();

  // 4. Stale cache + failure -> shows saved copy with explanation
  ({ page } = await openPage(browser, { mode: "500" }));
  await page.evaluate(() => localStorage.setItem("portfolio-github-cache", JSON.stringify({ savedAt: Date.now() - 3 * 3600e3, repos: [{ name: "saved-repo", description: "", url: "https://github.com/x/saved-repo", language: "C", stars: 2, fork: false, archived: false, pushedAt: new Date().toISOString() }] })));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.querySelector("#github").scrollIntoView());
  await page.waitForSelector(".notice-error", { timeout: 15000 });
  console.log("  [stale+500]", await repoNames(page), "|", await statusText(page));
  check("stale cache shown on failure", (await repoNames(page)).join() === "saved-repo");
  await page.close();

  await browser.close();
})();
