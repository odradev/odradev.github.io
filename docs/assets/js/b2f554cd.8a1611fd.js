"use strict";(self.webpackChunkodra_website=self.webpackChunkodra_website||[]).push([[477],{10:e=>{e.exports=JSON.parse('{"blogPosts":[{"id":"release-020","metadata":{"permalink":"/blog/release-020","source":"@site/blog/2022-11-30-release-020/index.md","title":"Odra 0.2.0 Released","description":"We want to introduce you to the very first public release of the Odra Framework proudly!","date":"2022-11-30T00:00:00.000Z","formattedDate":"November 30, 2022","tags":[],"readingTime":3.06,"hasTruncateMarker":true,"authors":[{"name":"Kuba P\u0142askonka","title":"Lead Developer","url":"https://github.com/kubaplas","key":"kubaplas"},{"name":"Krzysztof Pobiar\u017cyn","title":"Lead Developer","url":"https://github.com/kpob","key":"kpob"},{"name":"Maciej Zieli\u0144ski","title":"CTO","url":"https://github.com/zie1ony","key":"zie1ony"}],"frontMatter":{"slug":"release-020","title":"Odra 0.2.0 Released","authors":["kubaplas","kpob","zie1ony"]}},"content":"We want to introduce you to the very first public release of the Odra Framework proudly!\\n\\n\x3c!--truncate--\x3e\\n\\n## A bit of history\\nMore than a year ago Maciej Zieli\u0144ski resigned from the position of Ecosystem Leader at [CasperLabs][casperlabs].\\nAlong with Krzysztof Pobiar\u017cyn and Kuba P\u0142askonka, we formed an engineering team dedicated to smart contracts.\\n\\nLooking at the blockchain ecosystems from the smart contract developer perspective there are two universes.\\nThe first one is Solidity, which thrives and is at its best now.\\nIt has a ton of well-tested code and security tooling.\\nWhenever an EVM-based blockchain pops out it gets populated by forks of DeFi and DAO protocols.\\nFascinating network effect emerges - code written for one EVM-based blockchain can be run on every other EVM-based blockchain.\\nThe second universe is Rust which compiles to WebAssembly.\\nHere developer communities live in the guarded cities of Polkadot, Cosmos, Solana, Casper, and Near. \\nThe code written for one platform is not portable.\\nThe network effect never had a chance to arise.\\n\\nThe main reason why Odra exists is achieving this cross-chain code reusability.\\nWe could paraphrase a bit and say:\\n\\"One to bring them all and in the code bind them.\\"\\n\\n## Odra for Casper\\nThe very first blockchain we have integrated with Odra is Casper.\\nIn comparison to [casper-contract][casper-contract] API, it greatly cuts development time and offers a much lower entry level.\\nThe Odra interface is developer friendly and people familiar with Solidity, [Ink][ink], or [Near][near-sdk] will feel like at home.\\nWe hope it will unleash the creativity and bring a whole bunch of products onto Casper.\\n\\n## Odra Framework\\n\\nOdra is a high-level smart contract framework for Rust, which encourages rapid development and clean, pragmatic design.\\nBuilt by experienced developers, it takes care of much of the hassle of smart contract development, enabling you to focus on writing your dapp without reinventing the wheel.\\nIt\'s free and open source.\\n\\nOdra\'s goal is to become the go-to smart contract framework for all WebAssembly-based blockchains. \\n\\nA smart contract written using Odra can be executed on all integrated systems.\\nWe can do it by abstracting over core concepts that all the above systems are built around. \\nThese are type system, storage, entry points, execution context, and testing environment.\\nWe believe it will bring standardization to the development of Rust-based smart contracts and enable code reusability we have not yet seen in this ecosystem.\\n\\nLet\u2019s look at a Flipper contract, that holds a boolean value.\\nThe contract has a constructor that sets the initial value, and two entry points: `flip()` and `get()`, to change and query the current value, respectively.\\n\\n```rust\\nuse odra::Variable;\\n\\n#[odra::module]\\npub struct Flipper {\\n    value: Variable<bool>,\\n}\\n\\n#[odra::module]\\nimpl Flipper {\\n\\n    #[odra(init)]\\n    pub fn init(&mut self, value: bool) {\\n        self.value.set(value);\\n    }\\n\\n    pub fn flip(&mut self) {\\n        self.value.set(!self.get());\\n    }\\n\\n    pub fn get(&self) -> bool {\\n        self.value.get_or_default()\\n    }\\n}\\n```\\n\\nIt comes with the CLI tool [cargo-odra] that makes it easy to use Odra.\\n\\n![cargo-odra](./cargo_odra.gif)\\n\\nNeat and simple, isn\'t it? Do you like it? Start flowing with us!\\n\\n## What next\\n\\nLet\'s be honest, we are just starting.\\nThe codebase is still hot.\\nOn the other hand, we are happy with the interfaces we designed.\\nNow is the time to write documentation and tutorials.\\nWe are also building the modules library inspired by [OpenZeppelin][open-zeppelin].\\nThe security code audit is still ahead of us.\\n\\n## Join us\\n\\nCheck out the [Odra GitHub repository][odra-repo] for more info on how to get the most out of Odra. \\nShould you have questions, join [our Discord][odra-discord], [our Twitter][odra-twitter] or write us at contact@odra.dev.\\n\\n[casperlabs]:      https://casperlabs.io\\n[odra-repo]:       https://github.com/odradev/odra\\n[odra-discord]:    https://discord.gg/Mm5ABc9P8k\\n[odra-twitter]:    https://twitter.com/odradev\\n[casper-contract]: https://crates.io/crates/casper-contract\\n[ink]:             https://crates.io/crates/ink_lang\\n[near-sdk]:        https://crates.io/crates/near-sdk\\n[open-zeppelin]:   https://github.com/OpenZeppelin/openzeppelin-contracts/"}]}')}}]);