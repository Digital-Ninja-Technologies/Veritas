import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// "Ask AI about Veritas": the AI assistant reads the LIVE site, so keep SITE_DOMAIN set to the public domain.
const SITE_DOMAIN = 'useveritasapp.com';
const ASK_PROMPT = `Read ${SITE_DOMAIN} and summarise what Veritas does, who it is for, and how its escrow and payouts work, using only what the site itself says.`;
const ASK_URLS = {
  chatgpt: 'https://chatgpt.com/?q=',
  claude: 'https://claude.ai/new?q=',
  perplexity: 'https://www.perplexity.ai/search?q=',
};

// Tiny include system: <!--@nav--> / <!--@footer--> / <!--@modal--> are replaced by src/partials/*.html
const partials = () => ({
  name: 'veritas-partials',
  transformIndexHtml: {
    order: 'pre',
    handler(html) {
      return html
        .replace(/<!--@(\w+)-->/g, (_, name) => readFileSync(resolve(__dirname, `src/partials/${name}.html`), 'utf8'))
        .replace(/\{\{ask:(\w+)\}\}/g, (_, k) => ASK_URLS[k] + encodeURIComponent(ASK_PROMPT));
    },
  },
});

export default defineConfig({
  plugins: [partials()],
  build: {
    target: 'es2020',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        veripals: resolve(__dirname, 'veripals.html'),
        contact: resolve(__dirname, 'contact.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
      },
    },
  },
});
