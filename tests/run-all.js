// Runs every *.test.js file against the local index.html and reports a summary.
// Usage (from the tests folder): npm install, then npm test
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const site = pathToFileURL(path.resolve(__dirname, "..", "index.html")).href;
const screenshots = path.join(__dirname, "screenshots");
fs.mkdirSync(screenshots, { recursive: true });

const files = fs.readdirSync(__dirname).filter((file) => file.endsWith(".test.js"));
let passed = 0;
let failed = 0;

for (const file of files) {
  console.log(`\n▶ ${file}`);
  let output = "";
  try {
    output = execFileSync(process.execPath, [path.join(__dirname, file), site, screenshots], { encoding: "utf8" });
  } catch (error) {
    // A crashed test still prints what it got through before failing.
    output = `${error.stdout || ""}\nFAIL ${file} crashed: ${error.message}`;
  }
  process.stdout.write(output);
  passed += (output.match(/^PASS /gm) || []).length;
  failed += (output.match(/^FAIL /gm) || []).length;
}

console.log(`\n${passed} checks passed, ${failed} failed. Screenshots: ${screenshots}`);
process.exit(failed > 0 ? 1 : 0);
