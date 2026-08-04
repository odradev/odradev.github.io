// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const {themes: prismThemes} = require('prism-react-renderer');

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: 'Odra',
    tagline: 'Writing smart contracts have never been easier!',
    url: 'https://odra.dev',
    baseUrl: '/',
    onBrokenLinks: 'throw',
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
                'docs/0.*/**/*',
                'docs/1.*/**/*',
                'docs/2.*/**/*',
                'docs/next/**/*'
            ]
        }],
        [
            require.resolve('./plugins/llms-txt/index.js'),
            {
                docsDir: 'docs',
                outputFile: 'llms.txt',
                extraSections: [
                    {
                        label: 'Repositories and tooling',
                        description: 'Code and tools that live outside of this documentation site.',
                        links: [
                            {
                                title: 'Odra framework',
                                url: 'https://github.com/odradev/odra',
                                note: 'source of the framework, project templates and examples',
                            },
                            {
                                title: 'Cargo Odra',
                                url: 'https://github.com/odradev/cargo-odra',
                                note: 'project generator and build tool, `cargo install cargo-odra --locked`',
                            },
                            {
                                title: 'Odra API reference',
                                url: 'https://docs.rs/odra/latest/odra/',
                                note: 'generated Rust documentation',
                            },
                            {
                                title: 'Odra Claude Code plugin',
                                url: 'https://github.com/odradev/odradev-plugins',
                                note: 'skills for agentic Odra development, `/plugin marketplace add odradev/odradev-plugins`',
                            },
                            {
                                title: 'Documentation source',
                                url: 'https://github.com/odradev/odradev.github.io',
                                note: 'the repository this file is generated from',
                            },
                        ],
                    },
                ],
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
                    lastVersion: '2.9',
                    versions: {
                        current: {
                            label: 'next',
                        },
                        // Snapshots cover a minor line, not a patch release - fixes are copied
                        // into the existing snapshot instead of cutting a new one per patch.
                        '2.9': {
                            label: '2.9.*',
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
        hooks: {
            onBrokenMarkdownLinks: 'warn',
        },
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
                theme: prismThemes.github,
                darkTheme: prismThemes.vsDark,
                additionalLanguages: ['rust', 'solidity'],
            },
        }),
};

module.exports = config;

