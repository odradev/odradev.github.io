// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Odra Blog',
  tagline: 'Writing smart contracts have never been easier!',
  url: 'https://odra.dev',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'odradev', // Usually your GitHub org/user name.
  projectName: 'odra', // Usually your repo name.

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        blog: {
          showReadingTime: true,
          blogSidebarCount: 0,
          postsPerPage: 'ALL',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: false,
        respectPrefersColorScheme: false,
      },
      navbar: {
        logo: {
          alt: 'Odra Logo',
          src: 'img/small_logo.png',
        },
        items: [
          {
            to: '/blog',
            label: 'Blog',
            position: 'left'
          },
          {
            href: 'https://github.com/odradev/odra',
            label: 'GitHub',
            position: 'right',
          },
          {
            href: 'https://twitter.com/odradev',
            label: 'Twitter',
            position: 'right',
          },
          {
            href: 'https://discord.gg/Mm5ABc9P8k',
            label: 'Discord',
            position: 'right',
          }
        ],
      },
      footer: {
        style: 'light',
        copyright: 'by <a href="https://odra.dev">odra.dev<a>',
      },
      prism: {
        theme: require('prism-react-renderer/themes/github'),
        darkTheme: require('prism-react-renderer/themes/vsDark'),
        additionalLanguages: ['rust', 'solidity'],
      },
    }),
};

module.exports = config;