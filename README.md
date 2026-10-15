# Abdullah Ewidah — Portfolio (Assignment 1)

A responsive personal portfolio for SWE 363 Assignment 1. It introduces my background in computer engineering, shows three projects from my resume, and provides a contact form that opens an email draft.

## Run locally

No installation or build step is needed. Open `index.html` in a modern browser. You can also serve this folder locally, for example with `python -m http.server 8000`, then visit `http://localhost:8000`.

## What is included

- About, Projects, and Contact sections
- Responsive layouts for desktop, tablet, and mobile
- Light/dark theme toggle that remembers a choice when browser storage is available
- Accessible navigation, form labels, and reduced motion support
- Three local SVG placeholder illustrations
- Contact form that validates inputs and opens an email draft; no backend or message storage

## Folder structure

```text
assignment-1/
├── README.md
├── index.html
├── css/styles.css
├── js/script.js
├── assets/images/*.svg
├── docs/ai-usage-report.md
├── docs/technical-documentation.md
└── .gitignore
```

## AI use

I worked with OpenAI Codex on the portfolio's content, code, design, testing, and documentation. [The AI usage report](docs/ai-usage-report.md) explains our collaboration, the issues we resolved, and Codex's role.

## Submission

The assignment asks for a public GitHub repository named `id-name-assignment1`, where `id` is my student ID and `name` is my first and last name without spaces. Create that repository from this folder and submit its URL through Blackboard. The local folder is kept under `assignments/` to match the course workspace organization.
