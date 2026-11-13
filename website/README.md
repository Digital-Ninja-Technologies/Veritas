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
- `privacy.html` / `terms.html` are drafts written for the app (accounts, escrow, stablecoin funding, local payouts). Have counsel review them and confirm: the data/partners listed, the dispute process, fees/liability cap, the governing-law clause (Terms §13, which points to where Useveritas Limited is incorporated), and the contact emails.
- Calculator rates in `src/main.js` are illustrative only.
- `veripals.html` (creator program) is a draft: confirm the reward/payout terms, eligibility and content rules before launch. Applications post to the Formspree endpoint with subject "Veripals application".
- `about.html` is a draft built only from product facts. Add real company details when ready (founding story, founder note, team, milestones) and confirm the five values.
