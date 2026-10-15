# AI Usage Report — Assignment 2

This report explains which AI tools I used, what I asked them to do, where their output was wrong and how that was caught, and how the important parts of the code work. All the mistakes listed in section 4 really happened during this assignment, and each fix can be found in the commit history.

## Contents

1. [Tools used](#1-tools-used)
2. [How I used AI, step by step](#2-how-i-used-ai-step-by-step)
3. [How the AI's work was checked](#3-how-the-ais-work-was-checked)
4. [Where the AI was wrong](#4-where-the-ai-was-wrong)
5. [Design decisions made along the way](#5-design-decisions-made-along-the-way)
6. [Understanding the code](#6-understanding-the-code)
7. [Creative uses of AI](#7-creative-uses-of-ai)
8. [My review, edits, and reflection](#8-my-review-edits-and-reflection)
9. [Responsible use](#9-responsible-use)

---

## 1. Tools used

| Tool | What it is | How I used it |
| --- | --- | --- |
| **Claude Code** (Anthropic, Claude Opus 5.5 model) in the VS Code extension | An AI coding assistant that can read the project files, run commands, and edit code when asked | It was the main tool for this assignment. I used it to audit Assignment 1, plan the features, write and refactor the HTML, CSS, and JavaScript, write automated browser tests, run audits, and draft the documentation. |
| **OpenAI Codex** | An AI coding assistant | Only in Assignment 1. Its output is the baseline this assignment started from, and part of this assignment was finding and fixing its weak spots. |

These were **not** AI tools, but the AI used them to check its own work: **Puppeteer** (drives a real Chrome browser from code), **Google Lighthouse** (performance and accessibility audits), and **Git** (one branch per feature).

---

## 2. How I used AI, step by step

### Step 1: brief and direction

I gave Claude Code the full Assignment 2 brief. I told it to use my Assignment 1 portfolio as the starting point, but not to let it limit the new work: anything weak in Assignment 1 should be fixed, not carried forward.

### Step 2: audit of Assignment 1

Before writing new code, Claude Code read every Assignment 1 file and listed its problems:

| Problem in Assignment 1 | Why it mattered |
| --- | --- |
| In dark mode the contact section turned light, and its hard-coded green text lost contrast | Hard to read; an accessibility failure |
| The saved theme was applied only after the JavaScript loaded | Dark-mode visitors saw a white flash on every load |
| On phones the nav links were squeezed into the header at small font sizes | Hard to tap, cramped |
| Project cards were written as single, very long lines of HTML | Hard to read and maintain |
| The theme button had both `aria-pressed` and a label that changed | Screen readers heard "Switch to light theme, pressed", which is contradictory |
| The brand link's accessible name did not include its visible text "AE." | Voice-control users could not activate it by saying what they see |
| The AI report was very short and had typos | Weak documentation |

### Step 3: plan

Claude Code proposed a feature list mapped to the assignment requirements, and one Git branch per feature. The first commit is an untouched copy of Assignment 1, so every change since then can be seen with `git diff`.

```text
fix/foundations → feature/project-explorer → feature/github-repos → feature/contact-form
→ feature/about-tabs-greeting → feature/motion → fix/audit → docs/assignment-2
```

### Step 4: build, test, merge

For each branch, Claude Code:

1. wrote the code;
2. checked the JavaScript syntax with `node --check`;
3. opened the page in headless Chrome, clicked and typed through the feature, and took screenshots;
4. fixed what was wrong;
5. merged the branch with a commit message that explains the change.

### Step 5: audit the finished site

Claude Code then ran checks on the finished site:

- Lighthouse on mobile and desktop;
- a colour-contrast calculation for every text and background pair in both themes;
- a scan for duplicate IDs and broken references;
- layout checks at six screen widths;
- offline mode;
- a full keyboard-only pass through the page.

### Step 6: documentation

Claude Code drafted the README, the technical documentation, and this report from the actual code and test results.

---

## 3. How the AI's work was checked

The rule was: **nothing counts as working until it has been seen working in a real browser.** By the end there were **63 automated checks** in `tests/`, which anyone can run with `npm test`. They test the features the way a visitor would use them:

- typing into the search box;
- clicking filters;
- pressing Tab, the arrow keys, Escape, and **/**;
- turning on offline mode;
- disabling JavaScript.

Some failures cannot be produced on demand. For those, the tests intercept the network request and **simulate** the failure: a GitHub rate limit, a server error, a dropped connection, and an account with only forked repositories. That way every error message was actually displayed and checked, not just written.

---

## 4. Where the AI was wrong

Every one of these was caught during the assignment and fixed in a commit.

| # | What was wrong | How it was caught | Fix |
| --- | --- | --- | --- |
| 1 | A "collapsed" project-highlights panel was still **33 px tall**, because its padding sat outside the part that gets clipped | Automated test measured the height | Moved the spacing inside the clipped wrapper so a collapsed panel is exactly 0 px |
| 2 | Search included the button text "Show highlights", so typing "show" matched **every** project | Reviewing what text the search actually indexed | Index only the real content (title, summary, tags, highlights, keywords) |
| 3 | The "no results" message suggested trying "Python" **to someone who had just searched for "python"** | Reading the test output | The message now explains *why* nothing matched (for example, matches exist in another area) and what to do |
| 4 | The accent-stripping regex was saved as **invisible combining characters** instead of `̀-ͯ` | Code review of the final file | Rewrote it with readable escapes |
| 5 | The toast's colored dot was nearly **invisible in one theme** | Design review | Gave the dot colors per theme |
| 6 | The brand link's name did not match its visible text (from Assignment 1) | Lighthouse accessibility audit | Replaced the `aria-label` with visually hidden text that starts with "AE." |
| 7 | The theme and menu buttons announced contradictory states (from Assignment 1) | Code review against the WAI-ARIA guidance | Theme button: action label only. Menu button: fixed "Menu" label plus `aria-expanded` |
| 8 | The **skip link appeared off-screen** when the page was scrolled | The keyboard tab-through test | Changed it to `position: fixed` |
| 9 | On phones, keyboard users could **tab past the GitHub cards** before they had loaded | The keyboard tab-through test | Show cached data immediately; start the API call earlier |
| 10 | Project images made each card very tall | Screenshot review | Cropped the images to a 2:1 ratio |
| 11 | The search placeholder was cut off at 320 px | Screenshot review at the smallest width | Shortened it |
| 12 | A double space after the greeting ("NIGHT OWL ·  COMPUTER…") | Screenshot review | Draw the separator with CSS |

Some test failures were **bugs in the AI's tests, not in the site.** Telling the two apart mattered:

- One GitHub test failed because it never scrolled to the section, and the section correctly waits to load until it is near the screen. The site was right; the test was fixed.
- One form test read `name.value`, which in a browser means the global `window.name`, not the Name input.
- One keyboard check measured the skip link 0.01 ms into its transition, before it had moved.

---

## 5. Design decisions made along the way

These were deliberate choices, not just whatever the AI wrote first:

| Decision | Alternatives considered | Reason |
| --- | --- | --- |
| No frameworks or libraries | React, jQuery, or an animation library | The site is small. Plain JavaScript loads fastest (Lighthouse 100) and shows that I understand the fundamentals. |
| One classic script, not ES modules | `<script type="module">` with several files | Browsers block module scripts on `file://` pages, and the README promises the site opens with a double-click. |
| Project data lives in the HTML | A JSON file or a JavaScript array | Without JavaScript, every project is still listed. JavaScript reads the cards and only adds search and filters on top. |
| Contact form opens an email draft | A form-handling service | The site has no server, and I did not want visitors' messages going through a third party. The text stays in the form in case no email app opens. |
| Cache GitHub data for 30 minutes | Fetch on every visit | GitHub allows only 60 requests an hour without a login. Caching makes repeat visits instant and avoids that limit. |
| Load the GitHub section only when needed | Fetch on page load | Visitors who never scroll that far cost no network request. |

---

## 6. Understanding the code

The assignment requires understanding the AI-generated code, not just using it. These are the techniques the site depends on, and why each one is used.

**Debouncing** (`debounce` in `script.js`). Search waits until typing pauses for 120 ms before filtering, instead of re-filtering on every key. Every call clears the previous timer, so only the last one runs:

```js
function debounce(callback, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), wait);
  };
}
```

**IntersectionObserver.** The browser reports when an element enters or leaves the screen, so the code never has to measure positions on every scroll event. The site uses it for three things:

- revealing sections;
- highlighting the current nav link, by watching a thin band in the middle of the screen (`rootMargin: "-45% 0px -50% 0px"`);
- starting the GitHub request only when that section is near.

**AbortController timeout.** `fetch` has no built-in timeout. A timer calls `controller.abort()` after 10 s, `fetch` then rejects with an `AbortError`, and the site turns that into the message "GitHub took too long to respond."

**Error types.** Instead of one generic "something went wrong", every failure is tagged with a `kind`: `offline`, `timeout`, `rate-limit`, `not-found`, `http`, or `network`. Each kind gets a message that says what happened and what to do next, as the assignment requires.

**`textContent` instead of `innerHTML`.** Repository names and descriptions come from GitHub, and search text comes from the visitor. Inserting either with `innerHTML` would let markup inside them run as HTML. The `createElement` helper always uses `textContent`, so outside text is only ever shown as plain text.

**Animating height with `grid-template-rows`.** CSS cannot animate `height: auto`. The highlights panel is a one-row grid whose row animates from `0fr` (no space) to `1fr` (exactly the content's height). Adding `visibility: hidden` when collapsed also removes the hidden links from the Tab order.

**Roving tabindex (tabs).** Only the selected tab has `tabindex="0"`; the others have `-1`. So Tab enters and leaves the tab list in one step, and the arrow keys move between tabs. This is the WAI-ARIA tabs pattern that screen-reader users expect.

**Safe storage.** `localStorage` can *throw* errors, for example in some private windows. Every read and write goes through a wrapper with `try…catch`, so the site keeps working and simply doesn't remember settings.

**Restarting an animation.** Removing and re-adding a CSS class in the same frame does nothing, because the browser never notices the class was gone. Reading `element.offsetWidth` in between forces the browser to apply the removal, so the animation plays again.

---

## 7. Creative uses of AI

- **AI auditing AI.** The first task was to have Claude Code review the work an earlier AI tool (Codex) produced for Assignment 1. It found real bugs that had gone unnoticed, such as the dark-mode contrast and the contradictory button states.
- **Simulating failures that are hard to trigger.** I can't make GitHub rate-limit me on demand, so the tests fake GitHub's exact responses. Every error state was seen on screen, not just imagined.
- **AI checking its own claims.** Before a claim went into the README, a check had to back it up, for example "no horizontal scrolling at any width", "WCAG AA contrast", or "works with the keyboard only". Some checks found problems (items 8, 9, and 11 in section 4), and the claims were only written after the fixes.

---

## 8. My review, edits, and reflection

> **Abdullah: complete this section in your own words before submitting.** The assignment says you must understand the AI's output and edit or improve it. Only you can honestly say what you checked and changed, so this section was deliberately left for you. Delete this note when you're done.

**What I reviewed and tested myself:**
<!-- For example: walked through every feature in my own browser, read script.js section by section, ran `npm test` -->

**What I changed or improved after reviewing the AI's output:**
<!-- List your own edits, even small ones: wording, content, colors, a feature you adjusted or removed -->

**Content I checked for accuracy:**
<!-- Confirm the project descriptions, the Skills tab, and the Education tab are accurate about you -->

**What I learned:**
<!-- 3–5 sentences: which technique was new to you, what surprised you, what you would do differently -->

---

## 9. Responsible use

- **Truthful content.** The project descriptions come from my real projects, as described in Assignment 1. Claude Code did not invent achievements, dates, or skills. The new items are limited to facts that can be checked:
  - the "This Portfolio Website" project;
  - the Skills and Education tabs, which reuse my existing projects and KFUPM details;
  - my public GitHub repositories.
- **Privacy.** No passwords, tokens, or private data were shared with the AI. The GitHub API is used without a login, so the code contains no secret. The only personal details in the site (email, LinkedIn, GitHub) are ones I already publish.
- **Control.** The AI worked only inside the assignment folder. Commits were made on local branches, and publishing the public repository is a separate step I do myself.
- **Learning over copying.** Section 6 explains how the code works, and section 8 records my own review. The AI sped up the work, but I am responsible for understanding everything in it.
