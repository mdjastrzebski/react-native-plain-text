import * as path from 'node:path';

import { defineConfig } from '@rspress/core';

const GITHUB_REPO = 'https://github.com/mdjastrzebski/react-native-plain-text';

export default defineConfig({
  // The doc root is this `docs/` directory itself. `docs/contributing/` holds
  // contributor notes for humans and agents, and the project files below are
  // not pages, so all are kept out of the published site.
  root: __dirname,
  base: '/react-native-plain-text/',
  title: 'React Native Plain Text',
  description: 'Faster, lighter React Native <Text> for single-style text',
  route: {
    exclude: [
      'contributing/**',
      'doc_build/**',
      'node_modules/**',
      'rspress.config.ts',
      'tsconfig.json',
    ],
  },
  // Brand palette and typography cues pulled from the example app's
  // `example/src/theme.ts` and `example/src/components/Specimen.tsx`.
  globalStyles: path.join(__dirname, 'styles/index.css'),
  // Render every page as Markdown alongside the HTML and emit `llms.txt` /
  // `llms-full.txt`, so LLMs can read the docs without scraping the site.
  llms: true,
  themeConfig: {
    // `llms: true` only emits the files; this adds the "Copy as Markdown" and
    // "Open in ChatGPT / Claude" controls under each page's H1.
    llmsUI: true,
    socialLinks: [{ icon: 'github', mode: 'link', content: GITHUB_REPO }],
    footer: {
      message: 'MIT Licensed',
    },
    nav: [{ text: 'Guide', link: '/guide/intro', activeMatch: '/guide/' }],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Introduction', link: '/guide/intro' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Props and styles', link: '/guide/props-and-styles' },
            { text: 'Recipes', link: '/guide/recipes' },
            { text: 'Performance', link: '/guide/performance' },
          ],
        },
      ],
    },
  },
});
