// Shared settings for the browser tests.
// puppeteer-core drives a Chrome or Edge that is already installed, so no
// browser download is needed. Set CHROME_PATH if yours lives elsewhere.
const fs = require("fs");

const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

const CHROME_PATH = CANDIDATES.find((candidate) => fs.existsSync(candidate));

if (!CHROME_PATH) {
  console.error("No Chrome or Edge found. Set CHROME_PATH to your browser's executable and run again.");
  process.exit(1);
}

module.exports = { CHROME_PATH };
