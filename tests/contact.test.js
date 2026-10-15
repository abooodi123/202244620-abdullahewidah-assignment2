// Drives the contact form: validation, counter, drafts, submit, and copy.
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
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle0" });

  const err = (name) => page.$eval(`#${name}-error`, (e) => e.textContent);
  const errorsShown = async () => ({ name: await err("name"), email: await err("email"), message: await err("message") });
  await page.evaluate(() => document.querySelector("#contact").scrollIntoView());

  // Tabbing through empty fields should not nag.
  await page.focus("#name");
  await page.keyboard.press("Tab");
  check("no error after tabbing past empty field", (await err("name")) === "");

  // Submit empty form.
  await page.click('#contact-form button[type="submit"]');
  await wait(300);
  const e1 = await errorsShown();
  console.log("  empty submit:", e1, "|", await page.$eval("#form-status", (e) => e.textContent));
  check("all three errors shown", e1.name && e1.email && e1.message);
  check("focus moved to first invalid", await page.evaluate(() => document.activeElement.id === "name"));
  check("aria-invalid set", (await page.$eval("#email", (e) => e.getAttribute("aria-invalid"))) === "true");
  await page.screenshot({ path: `${OUT}/contact-errors.png` });

  // Fix errors live.
  await page.type("#name", "Sara");
  check("name error clears while typing", (await err("name")) === "");
  await page.type("#email", "sara@example");
  await wait(50);
  console.log("  bad email:", await err("email"));
  check("bad email flagged", (await err("email")).includes("incomplete"));
  await page.type("#email", ".com");
  check("email error clears", (await err("email")) === "");
  await page.type("#message", "Hi there");
  console.log("  short msg:", await err("message"), "| counter:", await page.$eval("#message-count", (e) => e.textContent));
  await page.select("#topic", "Internship or job opportunity");

  // Draft restore after reload.
  await wait(600);
  await page.reload({ waitUntil: "networkidle0" });
  const restored = await page.evaluate(() => ({ name: document.querySelector("#name").value, email: document.querySelector("#email").value, message: document.querySelector("#message").value, topic: document.querySelector("#topic").value, notice: !document.querySelector("#draft-notice").hidden }));
  console.log("  restored:", restored);
  check("draft restored with notice", restored.name === "Sara" && restored.topic === "Internship or job opportunity" && restored.notice);
  await page.evaluate(() => document.querySelector("#contact").scrollIntoView());
  await wait(300);
  await page.screenshot({ path: `${OUT}/contact-draft.png` });

  // Valid submit.
  await page.type("#message", ", I'd like to talk about an internship.");
  await page.click('#contact-form button[type="submit"]');
  await wait(600);
  const status = await page.$eval("#form-status", (e) => e.textContent);
  console.log("  success:", status);
  check("success message shown", status.includes("Thanks, Sara"));
  check("form text kept after submit", (await page.$eval("#message", (e) => e.value)).includes("internship"));
  await page.screenshot({ path: `${OUT}/contact-success.png` });

  // Clear the form via the success action.
  const buttons = await page.$$(".form-alert .text-button");
  await buttons[1].click();
  await wait(200);
  check("clear empties form and draft", (await page.$eval("#name", (e) => e.value)) === "" && (await page.evaluate(() => localStorage.getItem("portfolio-contact-draft"))) === null);
  console.log("  toast:", await page.$eval("#toast", (e) => e.textContent));

  // Copy email.
  await page.click("#copy-email");
  await wait(300);
  console.log("  copy:", await page.$eval("#copy-email", (e) => e.textContent.trim()), "| toast:", await page.$eval("#toast", (e) => e.textContent));
  await page.screenshot({ path: `${OUT}/contact-toast.png` });

  console.log("errors:", errors);
  await browser.close();
})();
