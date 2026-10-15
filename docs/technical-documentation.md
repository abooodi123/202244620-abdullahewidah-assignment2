# Technical Documentation

## Overview

This is a static portfolio. `index.html` contains semantic page sections, `css/styles.css` handles the visual design and responsive layout, and `js/script.js` provides the interactive features. Local SVG files under `assets/images/` are illustrative project placeholders. There are no external libraries, APIs, or build tools.

## Layout and responsiveness

The page uses CSS Grid for the hero, About, Projects, and Contact layouts, with Flexbox for navigation, buttons, tags, and the footer. At widths below 900px, project cards use two columns. Below 680px, the page becomes a single column; the navigation and typography also become more compact. A small 380px breakpoint adjusts the narrowest layouts.

## Interactivity

- The theme button switches between light and dark color tokens and updates its accessible label. It uses the saved theme when available; otherwise it follows the device preference. Storage errors do not stop the page.
- The footer year updates from the visitor's current date.
- The contact form uses browser validation for required fields and email format, then opens a `mailto:` draft with an encoded subject and message. The visitor must send the message in their own email application. No data is saved or transmitted by this site.
- Section links use smooth scrolling, with motion removed when the visitor prefers reduced motion.

## Accessibility and compatibility

The document has a language, one main heading, landmarks, a skip link, labeled inputs, alt text for project illustrations, visible keyboard focus, and a live status message for form feedback. The page uses standard browser features and needs no dependencies. A configured email application is required for the contact form's draft action.

## Manual test checklist

1. Open `index.html` and check the About, Projects, and Contact links.
2. Resize the browser to desktop, tablet, and phone widths; check for clipped content and horizontal scrolling.
3. Toggle the theme, refresh, and confirm the chosen theme remains when storage is enabled.
4. Try submitting an empty form, then a valid form. Confirm validation and the email draft behavior.
5. Check the email and LinkedIn links and review the page with keyboard navigation.
