# Rotaract Club of Honiara — Website

Official website for the Rotaract Club of Honiara. Static HTML/CSS/JS, no build step required.

## Status

This is a **starter skeleton**, not a finished site. It exists to establish the folder structure,
shared header/nav/footer pattern, and base brand styling (colors, fonts, buttons, cards) before
handing off to Claude Code for full design and content development.

## Structure

```
/
├── index.html          Homepage (fully built out as the reference page)
├── about.html           ─┐
├── projects.html         │
├── events.html            │  Placeholder pages — same header/footer as index.html,
├── members.html           │  body content still to be designed & built
├── join.html              │
├── news.html               │
├── gallery.html            │
├── partners.html           │
├── contact.html          ─┘
├── css/
│   └── style.css       Brand colors (CSS variables), base layout, reusable component styles
├── js/
│   └── main.js          Mobile nav toggle (minimal — expand as needed)
├── assets/
│   ├── logo/             Club logo goes here (logo.png, favicon.png)
│   └── images/           Project/event/gallery photos go here
└── README.md
```

## Brand

Colors are defined as CSS variables at the top of `css/style.css`:

- `--maroon-dark`, `--maroon`, `--maroon-light` — primary brand color family
- `--gold`, `--gold-light` — accent color family
- `--cream`, `--cream-dark` — background/light color family
- No black is used as a core color, per club brand direction.

Update these variables to match the official logo exactly once the logo file is added to
`assets/logo/`.

## Placeholder content

Anything marked with a `.placeholder-note` badge or `[bracketed text]` is a placeholder and
needs real content before launch. Do not treat placeholder stats/text as real club data.

## Next steps (for Claude Code)

1. Add the real club logo to `assets/logo/` and update header/favicon references.
2. Fully design and build out each placeholder page (About, Projects, Events, Members, Join,
   News, Gallery, Partners, Contact) using the card/section patterns already established in
   `index.html` and `style.css`.
3. Replace placeholder stats, project cards, and member cards with real or clearly-marked
   sample content as directed.
4. Wire up the Contact page form and the "Support Us" CTA (contact-to-donate, not a payment
   integration, per project spec).
