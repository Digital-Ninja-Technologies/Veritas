import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Tiny include system: <!--@nav--> / <!--@footer--> / <!--@modal--> are replaced by src/partials/*.html
const partials = () => ({
  name: 'veritas-partials',
  transformIndexHtml: {
    order: 'pre',
    handler(html) {
      return html.replace(/<!--@(\w+)-->/g, (_, name) =>
        readFileSync(resolve(__dirname, `src/partials/${name}.html`), 'utf8')
      );
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
