# AI Usage Report — Assignment 2

I built this assignment together with an AI coding agent, Claude Code. I set the goals, the scope, and the decisions; Claude Code generated the code, tests, and documentation drafts and checked them in a real browser. This report explains how that worked, how the work was checked, where the first attempts were wrong and how they were fixed, and how the important parts of the code work. Every AI conversation and AI-generated artifact is listed in the [usage log](#10-ai-usage-log), and the full conversation is in the AI Evidence ZIP submitted on Blackboard. Every issue in section 4 really happened, and each fix can be found in the commit history.

## Contents

1. [Tools used](#1-tools-used)
2. [How we worked together](#2-how-we-worked-together)
3. [How we checked the work](#3-how-we-checked-the-work)
4. [Problems we found and fixed](#4-problems-we-found-and-fixed)
5. [Design decisions](#5-design-decisions)
6. [Understanding the code](#6-understanding-the-code)
7. [Creative uses of AI](#7-creative-uses-of-ai)
8. [Review and understanding](#8-review-and-understanding)
9. [Responsible use](#9-responsible-use)
10. [AI usage log](#10-ai-usage-log)
11. [AI evidence](#11-ai-evidence)
12. [Declaration](#12-declaration)

---

## 1. Tools used

| Tool | What it is | How we used it |
| --- | --- | --- |
| **Claude Code** (Anthropic, Claude Opus 5.5 model) in the VS Code extension | An AI coding assistant that can read project files, run commands, and edit code | It was my main partner for the whole assignment. We used it to audit Assignment 1, plan the features, build and refactor the HTML, CSS, and JavaScript, write automated browser tests, run audits, and write the documentation. |
| **OpenAI Codex** | An AI coding assistant | Used in Assignment 1 only. That work was the starting point for this assignment, and improving it was part of the goal. |

We also used three tools that are not AI to check the work: **Puppeteer** (drives a real Chrome browser from code), **Google Lighthouse** (performance and accessibility audits), and **Git** (one branch per feature).

---

## 2. How we worked together

### Step 1: setting the goal

We started from the full Assignment 2 brief. The goal was to use my Assignment 1 portfolio as the starting point, but not to let it limit the new work. Anything weak in Assignment 1 would be fixed, not carried forward.

### Step 2: auditing Assignment 1

Before adding anything new, we went through every Assignment 1 file and listed its problems:

| Problem in Assignment 1 | Why it mattered |
| --- | --- |
| In dark mode the contact section turned light, and its hard-coded green text lost contrast | Hard to read; an accessibility failure |
| The saved theme was applied only after the JavaScript loaded | Dark-mode visitors saw a white flash on every page load |
| On phones the nav links were squeezed into the header at small font sizes | Hard to tap and cramped |
| Project cards were written as single, very long lines of HTML | Hard to read and maintain |
| The theme button had both `aria-pressed` and a label that changed | Screen readers heard "Switch to light theme, pressed", which is contradictory |
| The brand link's accessible name did not include its visible text "AE." | Voice-control users could not activate it by saying what they see |
| The AI report was very short and had typos | Weak documentation |

### Step 3: planning

We mapped each assignment requirement to features and gave every feature its own Git branch. The first commit is an untouched copy of Assignment 1, so every improvement can be seen with `git diff`.

```text
fix/foundations → feature/project-explorer → feature/github-repos → feature/contact-form
→ feature/about-tabs-greeting → feature/motion → fix/audit → docs/assignment-2
```

### Step 4: building, testing, and merging

For each branch, Claude Code worked through the same loop and reported the results to me:

1. write the code;
2. check the JavaScript syntax with `node --check`;
3. open the page in a real browser, click and type through the feature, and look at screenshots;
4. fix what was wrong;
5. merge the branch with a commit message that explains the change.

### Step 5: auditing the finished site

Once all the features were in, Claude Code checked the whole site:

- Lighthouse on mobile and desktop;
- a contrast calculation for every text and background color pair in both themes;
- a scan for duplicate IDs and broken references;
- layout checks at six screen widths;
- offline mode;
- a full keyboard-only pass through the page.

### Step 6: documentation

Claude Code drafted the README, the technical documentation, and this report from the real code and test results. At my request, it later rewrote this report in a collaborative voice, and then added the usage log and the declaration required by the course's AI policy.

---

## 3. How we checked the work

Our rule was: **nothing counts as working until we have seen it working in a real browser.** By the end there were **63 automated checks** in `tests/`, which anyone can run with `npm test`. They use the site the way a visitor would:

- typing into the search box;
- clicking filters;
- pressing Tab, the arrow keys, Escape, and **/**;
- going offline;
- turning JavaScript off.

Some failures cannot be produced on demand. For those, the tests intercept the network request and **simulate** the failure: a GitHub rate limit, a server error, a dropped connection, and an account with only forked repositories. That way every error message was actually seen on screen and checked.

---

## 4. Problems we found and fixed

Each of these came up during the assignment and was fixed in a commit.

| # | What was wrong | How we caught it | Fix |
| --- | --- | --- | --- |
| 1 | A "collapsed" project-highlights panel was still **33 px tall**, because its padding sat outside the part that gets clipped | An automated test measured its height | Moved the spacing inside the clipped wrapper, so a collapsed panel is exactly 0 px |
| 2 | Search included the button text "Show highlights", so typing "show" matched **every** project | Reviewing what text the search actually indexed | Search now covers only the real content (title, summary, tags, highlights, keywords) |
| 3 | The "no results" message suggested trying "Python" **to someone who had just searched for "python"** | Reading the test output | The message now explains *why* nothing matched (for example, there are matches in another area) and what to do next |
| 4 | The regex that strips accents was saved as **invisible combining characters** instead of `̀-ͯ` | Code review of the final file | Rewrote it with readable escapes |
| 5 | The toast's colored dot was nearly **invisible in one theme** | Design review | Gave the dot separate colors for each theme |
| 6 | The brand link's accessible name did not match its visible text (from Assignment 1) | Lighthouse accessibility audit | Replaced the `aria-label` with visually hidden text that starts with "AE." |
| 7 | The theme and menu buttons announced contradictory states (from Assignment 1) | Code review against the WAI-ARIA guidance | The theme button now has only an action label; the menu button has a fixed "Menu" label plus `aria-expanded` |
| 8 | The **skip link appeared off-screen** when the page was scrolled | The keyboard tab-through test | Changed it to `position: fixed` |
| 9 | On phones, keyboard users could **tab past the GitHub cards** before they had loaded | The keyboard tab-through test | Cached data now shows immediately, and the API call starts earlier |
| 10 | Project images made each card very tall | Screenshot review | Cropped the images to a 2:1 ratio |
| 11 | The search placeholder was cut off at 320 px wide | Screenshot review at the smallest width | Shortened it |
| 12 | A double space after the greeting ("NIGHT OWL ·  COMPUTER…") | Screenshot review | Drew the separator with CSS instead |

Some test failures turned out to be **bugs in the tests, not in the site**, and telling the two apart was important:

- One GitHub test failed because it never scrolled down to the section. The section correctly waits until it is near the screen before loading, so the site was right and the test was fixed.
- One form test read `name.value`. In a browser that means the global `window.name`, not the Name input.
- One keyboard check measured the skip link 0.01 ms into its transition, before it had finished moving.

---

## 5. Design decisions

| Decision | Alternatives considered | Reason |
| --- | --- | --- |
| No frameworks or libraries | React, jQuery, or an animation library | The site is small. Plain JavaScript loads fastest (Lighthouse 100) and shows that I understand the fundamentals. |
| One classic script, not ES modules | `<script type="module">` with several files | Browsers block module scripts on `file://` pages, and the README promises the site opens with a double-click. |
| Project data lives in the HTML | A JSON file or a JavaScript array | Without JavaScript, every project is still listed. JavaScript reads the cards and adds search and filters on top. |
| The contact form opens an email draft | A third-party form service | The site has no server, and visitors' messages should not pass through a third party. The text stays in the form in case no email app opens. |
| GitHub data is cached for 30 minutes | Fetching on every visit | GitHub allows only 60 requests an hour without a login. The cache makes repeat visits instant and avoids that limit. |
| The GitHub section loads only when it is needed | Fetching as soon as the page loads | Visitors who never scroll that far cost no network request. |

---

## 6. Understanding the code

These are the main techniques the site relies on, and why each one is used.

**Debouncing** (`debounce` in `script.js`). The search waits until typing has paused for 120 ms, instead of filtering again on every key press. Every call cancels the previous timer, so only the last one runs:

```js
function debounce(callback, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), wait);
  };
}
```

**IntersectionObserver.** The browser reports when an element enters or leaves the screen, so the code never has to measure positions on every scroll. The site uses it for three things:

- fading sections in;
- highlighting the current link in the navigation bar, by watching a thin band across the middle of the screen (`rootMargin: "-45% 0px -50% 0px"`);
- starting the GitHub request only when that section is near.

**Timeout with `AbortController`.** `fetch` has no built-in timeout. A timer calls `controller.abort()` after 10 seconds. `fetch` then rejects with an `AbortError`, which becomes the message "GitHub took too long to respond."

**Error types.** Instead of one generic "something went wrong", each failure gets a `kind`: `offline`, `timeout`, `rate-limit`, `not-found`, `http`, or `network`. Each kind has its own message that says what happened and what to do next.

**`textContent` instead of `innerHTML`.** Repository names and descriptions come from GitHub, and search text comes from the visitor. If that text were inserted with `innerHTML`, any HTML inside it would be treated as part of the page. The `createElement` helper always uses `textContent`, so outside text always appears as plain text.

**Animating height with `grid-template-rows`.** CSS cannot animate `height: auto`. The highlights panel is a one-row grid, and the row animates from `0fr` (no space) to `1fr` (exactly the content's height). Adding `visibility: hidden` when the panel is collapsed also takes its hidden links out of the Tab order.

**Roving tabindex in the tabs.** Only the selected tab has `tabindex="0"`; the others have `-1`. Pressing Tab enters or leaves the whole tab list in one step, and the arrow keys move between tabs. This is the WAI-ARIA tabs pattern that screen-reader users expect.

**Safe storage.** In some private windows, reading or writing `localStorage` throws an error. Every read and write goes through a wrapper with `try…catch`, so the site keeps working and simply doesn't remember settings.

**Restarting an animation.** Removing a CSS class and adding it back in the same frame does nothing, because the browser never sees it removed. Reading `element.offsetWidth` in between forces the browser to apply the removal first, so the animation plays again.

---

## 7. Creative uses of AI

- **Auditing earlier AI work.** Our first task was to review what an earlier AI tool (Codex) produced for Assignment 1. That review found real problems no one had noticed, like the dark-mode contrast and the contradictory button states.
- **Simulating failures that are hard to trigger.** There is no way to make GitHub rate-limit you on demand, so the tests imitate GitHub's exact responses. Every error state was seen on screen, not just described.
- **Backing every claim with a check.** Each claim in the README had to pass a check before it was written: "no horizontal scrolling at any width", "WCAG AA contrast", "works with the keyboard only". Some of those checks found problems (items 8, 9, and 11 in section 4), and the claims were written only after the fixes.

---

## 8. Review and understanding

I reviewed the finished project and understand how each part works:

- **The structure of `index.html`:** how the content stays readable without JavaScript, and how the controls that need JavaScript stay hidden until it runs.
- **The front-end logic in `script.js`:** how each feature starts independently, and how data flows through it. Project cards are read from the HTML into a state object, which is then rendered. GitHub data goes from the API to the cache to the page, with a fallback for each kind of error. Form input goes through validation, then into a saved draft, then into an email draft.
- **The styling in `styles.css`:** the color tokens behind the two themes, the responsive layouts, and the motion rules, including the reduced-motion setting.

What I learned from this assignment:
- AI-written code needs to be checked in a real browser. Several of the problems in section 4 looked fine in the code and only showed up when the page was tested.
- Accessibility details matter, and they are easy to get wrong.
- Using AI well means directing it, questioning its output, and understanding everything before it ships.

---

## 9. Responsible use

- **Accurate content.** The project descriptions come from my real projects, as described in Assignment 1. No achievements, dates, or skills were invented. The new content is limited to things anyone can check:
  - the "This Portfolio Website" project;
  - the Skills and Education tabs, which reuse my existing projects and KFUPM details;
  - my public GitHub repositories.
- **Privacy.** No passwords, tokens, or private data were shared with the AI. The GitHub API is used without a login, so the code contains no secrets. The only personal details on the site (email, LinkedIn, GitHub) are ones I already publish.
- **Control.** The AI worked only inside the assignment folder, all commits were made on local branches, and I decide when the public repository is published.
- **Understanding over copying.** The AI made the work faster, but I am responsible for understanding every part of the project, and section 6 explains how the code works.

---

## 10. AI usage log

One row per AI conversation or AI-generated artifact. The commit IDs refer to this repository's history, where every change can be inspected with `git show <commit>`.

| # | Date | Tool | Conversation or artifact | Purpose | Files affected | What I changed or directed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-10-15 to 2026-10-31 | Claude Code (Claude Opus 5.5), VS Code extension | **Conversation:** one Claude Code session, ID `117bfa8f-8024-4be1-9f62-88cbb97576a2` (full transcript in the AI Evidence ZIP) | The whole assignment: auditing Assignment 1, planning, building, testing, documentation, and publishing | All files in the repository | Gave the brief and the goal (fix Assignment 1's weak spots and go beyond it); answered questions; chose to keep the AI's design; approved creating the public repo and GitHub Pages |
| 2 | 2026-10-15 | Claude Code | **Artifact:** baseline copy of Assignment 1 (`935e1c1`) | Starting point, so every later change is visible | All Assignment 1 files, copied unchanged | None (an unchanged copy of my Assignment 1) |
| 3 | 2026-10-15 | Claude Code | **Artifact:** foundations fix (`4891b97`) | Fix Assignment 1 problems: dark-mode contrast, theme flash, mobile menu, formatting | `index.html`, `css/styles.css`, `js/script.js`, `assets/images/portfolio-site.svg`, `assets/images/favicon.svg`, `.gitattributes`, `.gitignore` | No manual edits to the generated code |
| 4 | 2026-10-15 | Claude Code | **Artifact:** project explorer (`19e1cad`) | Search, filters, sorting, expandable highlights, empty state | `index.html`, `css/styles.css`, `js/script.js` | No manual edits to the generated code |
| 5 | 2026-10-15 | Claude Code | **Artifact:** GitHub repositories section (`3ea8612`) | Public API data, loading and error states, cache | `index.html`, `css/styles.css`, `js/script.js` | No manual edits to the generated code |
| 6 | 2026-10-16 | Claude Code | **Artifact:** contact form rebuild (`31275c1`) | Inline validation, drafts, success message, copy-email button, toasts | `index.html`, `css/styles.css`, `js/script.js` | No manual edits to the generated code |
| 7 | 2026-10-16 | Claude Code | **Artifact:** About tabs and greeting (`8b3ab3b`) | Accessible tabs, time-of-day greeting, Dhahran clock | `index.html`, `css/styles.css`, `js/script.js` | No manual edits to the generated code |
| 8 | 2026-10-16 | Claude Code | **Artifact:** motion (`3fd1b80`) | Scroll reveals, hover effects, back to top, theme cross-fade | `index.html`, `css/styles.css`, `js/script.js` | No manual edits to the generated code |
| 9 | 2026-10-16 | Claude Code | **Artifact:** audit fixes (`8a27006`) | Accessibility fixes from the Lighthouse audit and code review | `index.html`, `css/styles.css`, `js/script.js` | No manual edits to the generated code |
| 10 | 2026-10-16 | Claude Code | **Artifact:** automated browser tests (`77c3131`, `9665948`, `5a07597`) | 63 browser checks, plus the keyboard fixes those checks found | `tests/*`, `index.html`, `css/styles.css`, `js/script.js` | No manual edits to the generated code |
| 11 | 2026-10-16 | Claude Code | **Artifact:** documentation (`68bc95d`, `6180e41`) | README, technical documentation, first version of this report, screenshots | `README.md`, `docs/*` | No manual edits |
| 12 | 2026-10-16 | Claude Code | **Artifact:** report rewrite (`76cb2c3`) | Rewrite this report in a collaborative voice | `docs/ai-usage-report.md`, `README.md` | Requested this rewrite and its tone |
| 13 | 2026-10-16 | Claude Code | **Action:** publishing (no file changes) | Create the public GitHub repository, push all branches, enable GitHub Pages, check the live site | GitHub repository settings | Approved publishing |
| 14 | 2026-10-31 | Claude Code | **Artifact:** this usage log, the declaration, and the evidence ZIP | Meet the course's AI declaration policy | `docs/ai-usage-report.md`; the evidence ZIP (not in the repository) | Provided the policy and asked for these to be added |

---

## 11. AI evidence

The **AI Evidence ZIP**, `202244620-abdullahewidah-assignment2-ai-evidence.zip`, is submitted on Blackboard with the repository link. As the policy requires, it is not committed to this repository. It contains:

- **the full conversation:** the original Claude Code session transcript (JSONL), plus a readable Markdown version;
- **the intermediate artifacts:** every AI-generated change as a numbered patch, in the order it was made, and a full snapshot of the project after each commit.

---

## 12. Declaration

> *[Paste the declaration statement from the assignment guidelines here, word for word.]*

| | |
| --- | --- |
| **Name** | Abdullah Mohammed Ewidah |
| **Student ID** | 202244620 |
| **Date** | |
| **Signature** | |
