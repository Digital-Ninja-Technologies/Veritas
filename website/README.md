# Veritas website (v2)

New marketing / app-download site. Vite + vanilla JS, GSAP (ScrollTrigger) and Lenis.
Deployed as its own Vercel project (`veritas-web`, root directory `website`), separate from the existing waitlist site at the repo root.

```bash
npm install
npm run dev      # local dev
npm run build    # outputs dist/
```

## Before launch
- Set the real store links in `src/config.js` (`STORE_URLS.ios` / `.android`). While empty, the store buttons show "Store link not set yet".
- Swap the plain store buttons for the official App Store / Google Play badges.
- Remove `noindex` (meta tag in each HTML file and the `X-Robots-Tag` header in `vercel.json`).
- The contact form posts to the existing Formspree endpoint (`CONTACT_ENDPOINT` in `src/main.js`).
- `privacy.html` / `terms.html` were ported from the waitlist site and still describe a waitlist; update the legal copy.
- Calculator rates in `src/main.js` are illustrative only.
