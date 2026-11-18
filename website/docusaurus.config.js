// @ts-check
import { themes as prismThemes } from 'prism-react-renderer'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const REPO = 'https://github.com/kesha-antonov/react-native-action-cable'
const NPM = 'https://www.npmjs.com/package/@kesha-antonov/react-native-action-cable'

// The docs pages are generated from the README and the docs folder at build
// time, so git has no date for the pages themselves. The sitemap takes the date
// of the last commit that touched their sources. Without git history (a tarball,
// a shallow clone with no match) the dates are left out.
function docsLastModified() {
  try {
    const date = execFileSync(
      'git',
      ['log', '-1', '--format=%cs', '--', '../README.md', '../docs', '../MIGRATION.md', '.'],
      { cwd: fileURLToPath(new URL('.', import.meta.url)), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim()
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined
  }
  catch {
    return undefined
  }
}
const LASTMOD = docsLastModified()

// Describes the library to search engines, on every page.
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareSourceCode',
  name: 'React Native ActionCable',
  description: 'Use Rails ActionCable channels with React Native for real-time WebSocket communication.',
  codeRepository: REPO,
  programmingLanguage: 'TypeScript',
  runtimePlatform: 'React Native',
  license: 'https://opensource.org/licenses/MIT',
  url: 'https://kesha-antonov.com/react-native-action-cable/',
  author: { '@type': 'Person', name: 'Kesha Antonov', url: 'https://kesha-antonov.com/' },
}

// Every page gets that one date.
const sitemapWithDates = {
  createSitemapItems: async ({ defaultCreateSitemapItems, ...rest }) => {
    const items = await defaultCreateSitemapItems(rest)
    return LASTMOD ? items.map(item => ({ ...item, lastmod: LASTMOD })) : items
  },
}

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'React Native ActionCable',
  tagline: 'Rails ActionCable channels over WebSocket in React Native, with no document polyfills',

  favicon: 'https://kesha-antonov.com/favicon.ico',
  headTags: [
    { tagName: 'link', attributes: { rel: 'icon', type: 'image/png', sizes: '192x192', href: 'https://kesha-antonov.com/favicon-192.png' } },
    { tagName: 'link', attributes: { rel: 'apple-touch-icon', href: 'https://kesha-antonov.com/apple-touch-icon.png' } },
    { tagName: 'script', attributes: { type: 'application/ld+json' }, innerHTML: JSON.stringify(structuredData) },
  ],
  url: 'https://kesha-antonov.com',
  baseUrl: '/react-native-action-cable/',
  organizationName: 'kesha-antonov',
  projectName: 'react-native-action-cable',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  markdown: {
    // The pages are generated from README.md, which contains raw HTML that
    // MDX would reject, so they stay CommonMark.
    format: 'detect',
    hooks: { onBrokenMarkdownLinks: 'throw' },
  },

  i18n: { defaultLocale: 'en', locales: ['en'] },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.js',
          // Every page is generated from README.md, so that is the file to edit.
          editUrl: () => `${REPO}/edit/master/README.md`,
        },
        blog: false,
        sitemap: sitemapWithDates,
        theme: { customCss: './src/css/custom.css' },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/social-card.png',
      colorMode: { respectPrefersColorScheme: true },
      navbar: {
        title: 'React Native ActionCable',
        items: [
          { type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Docs' },
          { href: REPO, label: 'GitHub', position: 'right' },
          { href: NPM, label: 'npm', position: 'right' },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              { label: 'Installation', to: '/installation' },
              { label: 'Quick start', to: '/quick-start' },
              { label: 'API reference', to: '/api' },
              { label: 'Advanced usage', to: '/advanced' },
            ],
          },
          {
            title: 'More',
            items: [
              { label: 'GitHub', href: REPO },
              { label: 'npm', href: NPM },
              { label: 'Issues', href: `${REPO}/issues` },
              { label: 'Changelog', href: `${REPO}/blob/master/CHANGELOG.md` },
            ],
          },
          {
            title: 'More libraries',
            items: [
              { label: 'React Native Chat', href: 'https://kesha-antonov.com/react-native-chat/' },
              { label: 'React Native Zoom Reanimated', href: 'https://kesha-antonov.com/react-native-zoom-reanimated/' },
              { label: 'React Native Background Downloader', href: 'https://kesha-antonov.com/react-native-background-downloader/' },
              { label: 'React Native Cloud Sync', href: 'https://kesha-antonov.com/react-native-cloud-sync/' },
            ],
          },
          {
            title: 'Built by',
            items: [
              { label: 'Kesha Antonov', href: 'https://kesha-antonov.com' },
              { label: 'Hire a React Native lead engineer', href: 'https://kesha-antonov.com/react-native-developer/' },
              { label: 'GitHub profile', href: 'https://github.com/kesha-antonov' },
              { label: 'Sponsor', href: 'https://github.com/sponsors/kesha-antonov' },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Kesha Antonov.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['bash', 'json', 'ruby', 'java', 'kotlin', 'objectivec'],
      },
    }),
}

export default config
