// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: 'Odra',
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

    plugins: [
        [require.resolve('docusaurus-lunr-search'), {
            excludeRoutes: [
                'docs/0.2.0/**/*',
                'docs/0.3.0/**/*',
                'docs/0.3.1/**/*',
                'docs/0.4.0/**/*',
                'docs/0.5.0/**/*',
                'docs/0.6.0/**/*',
                'docs/0.7.0/**/*',
                'docs/0.8.0/**/*',
                'docs/0.9.0/**/*',
                'docs/0.9.1/**/*',
            ]
        }],
        [
            "docusaurus-plugin-generate-llms-txt",
            {
                outputFile: "llms.txt", // defaults to llms.txt if not specified
            },
        ],
    ],

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
                docs: {
                    sidebarPath: require.resolve('./sidebars.js'),
                    includeCurrentVersion: true,
                    showLastUpdateTime: true,
                    lastVersion: '2.3.1',
                    versions: {
                        current: {
                            label: 'next',
                        },
                    },
                },
                theme: {
                    customCss: require.resolve('./src/css/custom.css'),
                },
            }),
        ],
    ],

    markdown: {
        mermaid: true,
    },
    themes: ['@docusaurus/theme-mermaid'],


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
                    src: 'img/small_logo_light.png',
                    srcDark: 'img/small_logo_dark.png',
                },
                items: [
                    {
                        to: '/blog',
                        label: 'Blog',
                        position: 'left'
                    },
                    {
                        to: '/docs',
                        label: 'Docs',
                        position: 'left'
                    },
                    {
                        type: 'docsVersionDropdown',
                        position: 'right',
                        dropdownActiveClassDisabled: true,
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

