const root = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");
const contactForm = document.querySelector("#contact-form");

// Respect the visitor's saved choice, then fall back to their system preference.
let savedTheme;
try {
  savedTheme = localStorage.getItem("portfolio-theme");
} catch {
  // The site still works when storage is disabled.
}
const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
setTheme(savedTheme === "dark" || savedTheme === "light" ? savedTheme : preferredTheme);

function setTheme(theme) {
  root.dataset.theme = theme;
  themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
  themeToggle.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
}

themeToggle.addEventListener("click", () => {
  const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme);
  try {
    localStorage.setItem("portfolio-theme", nextTheme);
  } catch {
    // Keeping the choice for this page view is enough when storage is blocked.
  }
});

document.querySelector("#year").textContent = new Date().getFullYear();

// This static site has no server: compose a draft in the visitor's email app.
contactForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!contactForm.reportValidity()) return;

  const name = contactForm.elements.namedItem("name").value.trim();
  const email = contactForm.elements.namedItem("email").value.trim();
  const message = contactForm.elements.namedItem("message").value.trim();
  const status = document.querySelector("#form-status");

  if (!name || !email || !message) {
    status.textContent = "Please complete all fields before opening your email draft.";
    return;
  }

  const subject = encodeURIComponent(`Portfolio message from ${name}`);
  const body = encodeURIComponent(`${message}\n\nFrom: ${name}\nEmail: ${email}`);
  status.textContent = "Your email app should open with a draft. Please send it there to complete your message.";
  window.location.href = `mailto:ewidahabdullah@gmail.com?subject=${subject}&body=${body}`;
});
