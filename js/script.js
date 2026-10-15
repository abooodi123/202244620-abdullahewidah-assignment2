"use strict";

/* ==========================================================================
   Abdullah Ewidah — Portfolio scripts
   Every feature lives in its own init function. They are started at the
   bottom of this file, and one failing feature never stops the others.
   ========================================================================== */

const STORAGE_KEYS = {
  theme: "portfolio-theme",
};

/* ---------- Small helpers ---------- */

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

// localStorage throws in some private windows and when storage is blocked,
// so every access goes through these wrappers and the site keeps working.
const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing to clean up when storage is unavailable.
    }
  },
};

// Waits until calls stop for `wait` ms, so typing does not re-render on every key.
function debounce(callback, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), wait);
  };
}

// Lowercase and strip accents so "esp32", "ESP32", and "Esp 32 " compare fairly.
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Restarts a CSS animation, even when the class is already on the element.
function replayAnimation(element, className) {
  element.classList.remove(className);
  void element.offsetWidth; // Reading layout forces the browser to notice the removal.
  element.classList.add(className);
}

function isTypingTarget(element) {
  return Boolean(element && (element.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName)));
}

// Builds DOM nodes with textContent, which keeps outside data (like API
// responses) from ever being parsed as HTML.
function createElement(tag, { className, text, attrs } = {}, children = []) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  if (attrs) Object.entries(attrs).forEach(([name, value]) => element.setAttribute(name, value));
  element.append(...children);
  return element;
}

const relativeTimeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const TIME_UNITS = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

// Turns a date into friendly text such as "3 days ago" or "just now".
function timeAgo(date) {
  const seconds = Math.round((new Date(date).getTime() - Date.now()) / 1000);
  for (const [unit, size] of TIME_UNITS) {
    if (Math.abs(seconds) >= size) return relativeTimeFormat.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

function onMediaChange(query, handler) {
  // Safari before 14 only supports the older addListener API.
  if (query.addEventListener) {
    query.addEventListener("change", handler);
  } else {
    query.addListener(handler);
  }
}

/* ---------- Theme ---------- */

function initTheme() {
  const root = document.documentElement;
  const toggle = $("#theme-toggle");
  const themeColor = $('meta[name="theme-color"]');
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  // The inline script in <head> already chose the first theme before paint.
  function applyTheme(theme) {
    root.dataset.theme = theme;
    toggle.setAttribute("aria-pressed", String(theme === "dark"));
    toggle.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
    if (themeColor) themeColor.setAttribute("content", theme === "dark" ? "#101b19" : "#f5f6f3");
  }

  applyTheme(root.dataset.theme === "dark" ? "dark" : "light");

  toggle.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    storage.set(STORAGE_KEYS.theme, next);
  });

  // Follow live system changes until the visitor picks a theme themselves.
  onMediaChange(systemDark, (event) => {
    if (!storage.get(STORAGE_KEYS.theme)) applyTheme(event.matches ? "dark" : "light");
  });
}

/* ---------- Navigation ---------- */

function initNavigation() {
  const nav = $("#site-nav");
  const toggle = $("#menu-toggle");
  const links = $$(".nav-links a");
  const mobileLayout = window.matchMedia("(max-width: 680px)");

  function setMenuOpen(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  const isMenuOpen = () => nav.classList.contains("is-open");

  toggle.addEventListener("click", () => setMenuOpen(!isMenuOpen()));
  links.forEach((link) => link.addEventListener("click", () => setMenuOpen(false)));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isMenuOpen()) {
      setMenuOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (isMenuOpen() && !nav.contains(event.target) && !toggle.contains(event.target)) setMenuOpen(false);
  });

  onMediaChange(mobileLayout, (event) => {
    if (!event.matches) setMenuOpen(false);
  });

  // Highlight the link of whichever section crosses the middle of the screen.
  if (!("IntersectionObserver" in window)) return;

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const currentHash = `#${entry.target.id}`;
        links.forEach((link) => {
          if (link.hash === currentHash) {
            link.setAttribute("aria-current", "true");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );

  $$("main > section[id]").forEach((section) => sectionObserver.observe(section));
}

/* ---------- Project explorer ---------- */

const PROJECT_FILTERS = {
  all: "all areas",
  ai: "AI / ML",
  embedded: "Embedded",
  iot: "IoT",
  web: "Web",
};

const PROJECT_SORTERS = {
  featured: (a, b) => a.order - b.order,
  name: (a, b) => a.title.localeCompare(b.title),
  status: (a, b) => Number(b.status === "active") - Number(a.status === "active") || a.order - b.order,
};

function initProjectExplorer() {
  const toolbar = $("#project-toolbar");
  const grid = $("#project-grid");
  const searchInput = $("#project-search");
  const sortSelect = $("#project-sort");
  const chips = $$("[data-filter]", toolbar);
  const countText = $("#project-count");
  const emptyState = $("#project-empty");
  const emptyText = $("#project-empty-text");
  const resetButton = $("#project-reset");

  // The HTML is the single source of truth: read each card once.
  const projects = $$(".project-card", grid).map((card) => ({
    card,
    title: $("h3", card).textContent.trim(),
    categories: card.dataset.categories.split(" "),
    order: Number(card.dataset.order),
    status: card.dataset.status,
    // Index the real content only, not button labels such as "Show highlights".
    searchText: normalizeText(
      [...$$(".project-type, h3, .project-summary, .project-tags li, .project-details li", card).map((el) => el.textContent), card.dataset.keywords || ""].join(" ")
    ),
  }));

  // Start from the URL so a filtered view can be bookmarked or shared.
  const params = new URLSearchParams(window.location.search);
  const state = {
    query: params.get("q") || "",
    filter: PROJECT_FILTERS[params.get("area")] ? params.get("area") : "all",
    sort: PROJECT_SORTERS[params.get("sort")] ? params.get("sort") : "featured",
  };

  const searchTerms = () => normalizeText(state.query).split(" ").filter(Boolean);
  const matchesSearch = (project, terms) => terms.every((term) => project.searchText.includes(term));
  const matchesFilter = (project, filter) => filter === "all" || project.categories.includes(filter);

  function render({ animateAll = false } = {}) {
    const terms = searchTerms();
    let visibleCount = 0;

    // Re-append in sorted order so keyboard focus follows the visual order.
    [...projects].sort(PROJECT_SORTERS[state.sort]).forEach((project) => {
      const isMatch = matchesFilter(project, state.filter) && matchesSearch(project, terms);
      const wasHidden = project.card.hidden;
      grid.appendChild(project.card);
      project.card.hidden = !isMatch;
      if (!isMatch) return;
      visibleCount += 1;
      if (animateAll || wasHidden) replayAnimation(project.card, "is-entering");
    });

    // Each chip previews how many results it would give for the current search.
    chips.forEach((chip) => {
      const filter = chip.dataset.filter;
      const count = projects.filter((project) => matchesFilter(project, filter) && matchesSearch(project, terms)).length;
      chip.setAttribute("aria-pressed", String(filter === state.filter));
      $(".chip-count", chip).textContent = String(count);
    });

    updateSummary(visibleCount);
    syncUrl();
  }

  function updateSummary(visibleCount) {
    const area = state.filter === "all" ? "" : ` in ${PROJECT_FILTERS[state.filter]}`;
    const query = state.query.trim();
    const strong = document.createElement("strong");
    strong.textContent = String(visibleCount);

    // Built with text nodes, never innerHTML, so typed text cannot inject markup.
    countText.textContent = "";
    countText.append("Showing ", strong, ` of ${projects.length} projects${area}${query ? ` matching “${query}”` : ""}.`);

    emptyState.hidden = visibleCount > 0;
    if (visibleCount > 0) return;

    // Tell the visitor what to try next, based on why nothing matched.
    const terms = searchTerms();
    const matchesElsewhere = projects.filter((project) => matchesSearch(project, terms)).length;
    if (query && state.filter !== "all" && matchesElsewhere > 0) {
      emptyText.textContent = `Nothing mentions “${query}”${area}, but ${matchesElsewhere} ${matchesElsewhere === 1 ? "project" : "projects"} in other areas ${matchesElsewhere === 1 ? "does" : "do"}. Choose “All” to see ${matchesElsewhere === 1 ? "it" : "them"}.`;
    } else if (query) {
      emptyText.textContent = `Nothing mentions “${query}”. Check the spelling or try a broader keyword, such as a language or a device.`;
    } else {
      emptyText.textContent = `There are no projects${area} yet. Choose another area or show every project.`;
    }
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    const setParam = (key, value, fallback) => {
      if (value && value !== fallback) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    };
    setParam("q", state.query.trim(), "");
    setParam("area", state.filter, "all");
    setParam("sort", state.sort, "featured");
    try {
      history.replaceState(null, "", url);
    } catch {
      // Some browsers block history changes for local files; filtering still works.
    }
  }

  const renderSoon = debounce(render, 120);

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    renderSoon();
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && searchInput.value) {
      event.stopPropagation();
      searchInput.value = "";
      state.query = "";
      render();
    }
  });

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      state.filter = chip.dataset.filter;
      render();
    });
  });

  sortSelect.addEventListener("change", () => {
    state.sort = sortSelect.value;
    render({ animateAll: true });
  });

  resetButton.addEventListener("click", () => {
    state.query = "";
    state.filter = "all";
    searchInput.value = "";
    render();
    searchInput.focus();
  });

  // Press "/" anywhere (outside a text field) to jump to the search box.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(document.activeElement)) return;
    event.preventDefault();
    searchInput.focus();
  });

  // Expand and collapse project highlights.
  $$(".details-toggle", grid).forEach((button) => {
    const panel = document.getElementById(button.getAttribute("aria-controls"));
    const label = $(".details-label", button);
    button.hidden = false;
    button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(open));
      panel.classList.toggle("is-open", open);
      label.textContent = open ? "Hide highlights" : "Show highlights";
    });
  });

  searchInput.value = state.query;
  sortSelect.value = state.sort;
  toolbar.hidden = false;
  render();
}

/* ---------- GitHub repositories (public API) ---------- */

const GITHUB = {
  user: "abooodi123",
  cacheKey: "portfolio-github-cache",
  forksKey: "portfolio-github-forks",
  cacheMinutes: 30, // GitHub allows 60 anonymous requests an hour, so reuse results.
  timeoutMs: 10000,
  pageSize: 6,
};

// Colors match the ones GitHub uses for each language.
const LANGUAGE_COLORS = {
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  CSS: "#563d7c",
  Go: "#00add8",
  HTML: "#e34c26",
  Java: "#b07219",
  JavaScript: "#f1e05a",
  "Jupyter Notebook": "#da5b0b",
  Kotlin: "#a97bff",
  Python: "#3572a5",
  Rust: "#dea584",
  Shell: "#89e051",
  TypeScript: "#3178c6",
  Verilog: "#b2b7f8",
  VHDL: "#adb2cb",
};

const REPO_ICON =
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v16H7.5A2.5 2.5 0 0 0 5 20.5v-16ZM5 20.5A2.5 2.5 0 0 0 7.5 23H19v-5" /></svg>';

function gitHubError(kind, details = {}) {
  return Object.assign(new Error(kind), { kind }, details);
}

async function fetchGitHubRepos() {
  if (!navigator.onLine) throw gitHubError("offline");

  // Abort slow requests so the visitor is never left waiting forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GITHUB.timeoutMs);
  let response;
  try {
    response = await fetch(`https://api.github.com/users/${GITHUB.user}/repos?per_page=100&sort=pushed`, {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller.signal,
    });
  } catch (error) {
    throw gitHubError(error.name === "AbortError" ? "timeout" : "network");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const limitReached = (response.status === 403 || response.status === 429) && response.headers.get("x-ratelimit-remaining") === "0";
    const kind = limitReached ? "rate-limit" : response.status === 404 ? "not-found" : "http";
    throw gitHubError(kind, { status: response.status, resetAt: Number(response.headers.get("x-ratelimit-reset")) * 1000 });
  }

  const data = await response.json();
  if (!Array.isArray(data)) throw gitHubError("http");

  // Keep only the fields the page shows: a smaller cache and simpler rendering.
  return data.map((repo) => ({
    name: String(repo.name),
    description: repo.description ? String(repo.description) : "",
    url: String(repo.html_url),
    language: repo.language ? String(repo.language) : "",
    stars: Number(repo.stargazers_count) || 0,
    fork: Boolean(repo.fork),
    archived: Boolean(repo.archived),
    pushedAt: String(repo.pushed_at),
  }));
}

function describeGitHubError(error) {
  switch (error.kind) {
    case "offline":
      return "You seem to be offline. Reconnect to the internet and the list will load automatically.";
    case "timeout":
      return "GitHub took too long to respond. Please try again in a moment.";
    case "rate-limit": {
      const time = error.resetAt ? new Date(error.resetAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
      return `GitHub limits how often one network can request data, and that limit has been reached. Try again ${time ? `after ${time}` : "later"}, or open my profile on GitHub.`;
    }
    case "not-found":
      return "That GitHub profile could not be found. Please use the profile link below instead.";
    case "http":
      return `GitHub returned an unexpected response${error.status ? ` (error ${error.status})` : ""}. Please try again in a moment.`;
    default:
      return "The request to GitHub failed. Check your connection, then try again.";
  }
}

function createRepoCard(repo) {
  const safeUrl = repo.url.startsWith("https://github.com/") ? repo.url : `https://github.com/${GITHUB.user}`;
  const link = createElement("a", { text: repo.name, attrs: { href: safeUrl, target: "_blank", rel: "noopener noreferrer" } });
  const head = createElement("div", { className: "repo-head" }, [createElement("h3", {}, [link])]);
  head.insertAdjacentHTML("afterbegin", REPO_ICON);
  if (repo.fork) head.append(createElement("span", { className: "repo-badge", text: "Fork" }));
  if (repo.archived) head.append(createElement("span", { className: "repo-badge", text: "Archived" }));

  const description = createElement("p", {
    className: repo.description ? "repo-desc" : "repo-desc is-placeholder",
    text: repo.description || "No description provided yet.",
  });

  const footer = createElement("div", { className: "repo-footer" });
  if (repo.language) {
    const dot = createElement("span", { className: "lang-dot", attrs: { "aria-hidden": "true" } });
    if (LANGUAGE_COLORS[repo.language]) dot.style.setProperty("--lang-color", LANGUAGE_COLORS[repo.language]);
    footer.append(createElement("span", { className: "repo-lang" }, [dot, repo.language]));
  }
  if (repo.stars > 0) footer.append(createElement("span", { text: `${repo.stars} ${repo.stars === 1 ? "star" : "stars"}` }));
  footer.append(createElement("time", { text: `Updated ${timeAgo(repo.pushedAt)}`, attrs: { datetime: repo.pushedAt } }));

  return createElement("li", { className: "repo-card" }, [head, description, footer]);
}

function initGitHubRepos() {
  const section = $("#github");
  const toolbar = $("#repo-toolbar");
  const grid = $("#repo-grid");
  const status = $("#repo-status");
  const announcer = $("#repo-announcer");
  const updatedText = $("#repo-updated");
  const refreshButton = $("#repo-refresh");
  const forksToggle = $("#repo-forks");
  const sortSelect = $("#repo-sort");
  const moreButton = $("#repo-more");

  const state = {
    repos: null,
    savedAt: 0,
    includeForks: storage.get(GITHUB.forksKey) === "true",
    expanded: false,
    loading: false,
    failed: false,
  };

  function readCache() {
    try {
      const cache = JSON.parse(storage.get(GITHUB.cacheKey));
      if (cache && Array.isArray(cache.repos) && typeof cache.savedAt === "number") return cache;
    } catch {
      // A damaged cache is ignored and replaced on the next successful load.
    }
    return null;
  }

  function showLoading() {
    toolbar.hidden = true;
    moreButton.hidden = true;
    status.textContent = "";
    status.append(createElement("p", { className: "loading-message" }, [createElement("span", { className: "spinner", attrs: { "aria-hidden": "true" } }), "Loading repositories from GitHub…"]));
    grid.setAttribute("aria-busy", "true");
    grid.textContent = "";
    for (let i = 0; i < 3; i += 1) {
      const lines = ["skeleton-line is-title", "skeleton-line", "skeleton-line", "skeleton-line is-short"].map((className) => createElement("span", { className }));
      grid.append(createElement("li", { className: "repo-card is-skeleton", attrs: { "aria-hidden": "true" } }, lines));
    }
  }

  function showNotice(type, message, actions = []) {
    status.textContent = "";
    status.append(createElement("div", { className: `notice notice-${type}` }, [createElement("p", { text: message }), createElement("div", { className: "notice-actions" }, actions)]));
  }

  const retryButton = () => {
    const button = createElement("button", { className: "button button-primary", text: "Try again", attrs: { type: "button" } });
    button.addEventListener("click", () => load({ force: true }));
    return button;
  };

  const profileLink = () =>
    createElement("a", { className: "text-link", text: "Open GitHub profile ↗", attrs: { href: `https://github.com/${GITHUB.user}`, target: "_blank", rel: "noopener noreferrer" } });

  function render() {
    const forkCount = state.repos.filter((repo) => repo.fork).length;
    const sorter = sortSelect.value === "name" ? (a, b) => a.name.localeCompare(b.name) : (a, b) => new Date(b.pushedAt) - new Date(a.pushedAt);
    const list = state.repos.filter((repo) => state.includeForks || !repo.fork).sort(sorter);

    toolbar.hidden = false;
    grid.setAttribute("aria-busy", "false");
    grid.textContent = "";
    status.textContent = "";
    updatedText.textContent = `Updated ${timeAgo(state.savedAt)}`;

    if (list.length === 0) {
      moreButton.hidden = true;
      if (forkCount > 0) {
        const showForks = createElement("button", { className: "button button-secondary", text: "Include forks", attrs: { type: "button" } });
        showForks.addEventListener("click", () => {
          forksToggle.checked = true;
          forksToggle.dispatchEvent(new Event("change"));
        });
        showNotice("info", `No original repositories to show yet. Turn on “Include forks” to see ${forkCount} forked ${forkCount === 1 ? "repository" : "repositories"}.`, [showForks]);
      } else {
        showNotice("info", "There are no public repositories yet. New work will appear here automatically.", [profileLink()]);
      }
      announcer.textContent = "No repositories to show.";
      return;
    }

    const shown = state.expanded ? list : list.slice(0, GITHUB.pageSize);
    grid.append(...shown.map(createRepoCard));
    moreButton.hidden = list.length <= GITHUB.pageSize;
    moreButton.textContent = state.expanded ? "Show fewer" : `Show all ${list.length} repositories`;
    moreButton.setAttribute("aria-expanded", String(state.expanded));
    announcer.textContent = `Showing ${shown.length} of ${list.length} repositories.`;
  }

  function setRefreshing(isLoading) {
    refreshButton.disabled = isLoading;
    refreshButton.classList.toggle("is-loading", isLoading);
    $("span", refreshButton).textContent = isLoading ? "Refreshing…" : "Refresh";
  }

  async function load({ force = false } = {}) {
    if (state.loading) return;
    const cache = readCache();
    const cacheIsFresh = cache && Date.now() - cache.savedAt < GITHUB.cacheMinutes * 60 * 1000;
    if (!force && cacheIsFresh) {
      Object.assign(state, { repos: cache.repos, savedAt: cache.savedAt, failed: false });
      render();
      return;
    }

    state.loading = true;
    setRefreshing(true);
    if (!state.repos) showLoading();

    try {
      const repos = await fetchGitHubRepos();
      Object.assign(state, { repos, savedAt: Date.now(), failed: false });
      storage.set(GITHUB.cacheKey, JSON.stringify({ savedAt: state.savedAt, repos }));
      render();
    } catch (error) {
      state.failed = true;
      const fallback = state.repos ? { repos: state.repos, savedAt: state.savedAt } : cache;
      if (fallback) {
        // Stale data is better than none: show it and explain why it is old.
        Object.assign(state, fallback);
        render();
        showNotice("error", `${describeGitHubError(error)} Showing the copy saved ${timeAgo(fallback.savedAt)}.`, [retryButton()]);
      } else {
        grid.textContent = "";
        grid.setAttribute("aria-busy", "false");
        showNotice("error", describeGitHubError(error), [retryButton(), profileLink()]);
      }
    } finally {
      state.loading = false;
      setRefreshing(false);
    }
  }

  forksToggle.checked = state.includeForks;
  forksToggle.addEventListener("change", () => {
    state.includeForks = forksToggle.checked;
    state.expanded = false;
    storage.set(GITHUB.forksKey, String(state.includeForks));
    if (state.repos) render();
  });

  sortSelect.addEventListener("change", () => state.repos && render());
  refreshButton.addEventListener("click", () => load({ force: true }));

  moreButton.addEventListener("click", () => {
    state.expanded = !state.expanded;
    render();
    // After expanding, move focus to the first new card so keyboard users continue there.
    const firstNew = state.expanded && grid.children[GITHUB.pageSize];
    if (firstNew) $("a", firstNew).focus();
  });

  // Retry automatically when the connection comes back.
  window.addEventListener("online", () => state.failed && load({ force: true }));

  // Keep the "Updated … ago" label honest while the page stays open.
  setInterval(() => {
    if (state.repos && !state.loading) updatedText.textContent = `Updated ${timeAgo(state.savedAt)}`;
  }, 60 * 1000);

  // Only call the API when the section is close to the screen.
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        load();
      },
      { rootMargin: "400px 0px" }
    );
    observer.observe(section);
  } else {
    load();
  }
}

/* ---------- Footer ---------- */

function initFooterYear() {
  $("#year").textContent = String(new Date().getFullYear());
}

/* ---------- Contact form ---------- */

function initContactForm() {
  const form = $("#contact-form");
  const status = $("#form-status");

  // This static site has no server: compose a draft in the visitor's email app.
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const name = form.elements.namedItem("name").value.trim();
    const email = form.elements.namedItem("email").value.trim();
    const message = form.elements.namedItem("message").value.trim();

    if (!name || !email || !message) {
      status.textContent = "Please complete all fields before opening your email draft.";
      return;
    }

    const subject = encodeURIComponent(`Portfolio message from ${name}`);
    const body = encodeURIComponent(`${message}\n\nFrom: ${name}\nEmail: ${email}`);
    status.textContent = "Your email app should open with a draft. Please send it there to complete your message.";
    window.location.href = `mailto:ewidahabdullah@gmail.com?subject=${subject}&body=${body}`;
  });
}

/* ---------- Start ---------- */

[initTheme, initNavigation, initProjectExplorer, initGitHubRepos, initFooterYear, initContactForm].forEach((init) => {
  try {
    init();
  } catch (error) {
    console.error(`${init.name} could not start:`, error);
  }
});
