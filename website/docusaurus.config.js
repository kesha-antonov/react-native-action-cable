// @ts-check
import { themes as prismThemes } from 'prism-react-renderer'

const REPO = 'https://github.com/kesha-antonov/react-native-action-cable'
const NPM = 'https://www.npmjs.com/package/@kesha-antonov/react-native-action-cable'

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'React Native ActionCable',
  tagline: 'Rails ActionCable channels over WebSocket in React Native, with no document polyfills',

  url: 'https://kesha-antonov.github.io',
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
          editUrl: `${REPO}/edit/master/`,
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
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
            title: 'Built by',
            items: [
              { label: 'Kesha Antonov', href: 'https://github.com/kesha-antonov' },
              { label: 'cryptoc - crypto portfolio app', href: 'https://cryptoc-app.web.app/' },
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
