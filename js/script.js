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

[initTheme, initNavigation, initProjectExplorer, initFooterYear, initContactForm].forEach((init) => {
  try {
    init();
  } catch (error) {
    console.error(`${init.name} could not start:`, error);
  }
});
