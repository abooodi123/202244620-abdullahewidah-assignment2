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

[initTheme, initNavigation, initFooterYear, initContactForm].forEach((init) => {
  try {
    init();
  } catch (error) {
    console.error(`${init.name} could not start:`, error);
  }
});
