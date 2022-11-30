---
slug: release-020
title: Odra 0.2.0 Released
authors: [kubaplas, kpob, zie1ony]
---

We want to introduce you to the very first public release of the Odra Framework proudly!

<!--truncate-->

## A bit of history
More than a year ago Maciej Zieliński resigned from the position of Ecosystem Leader at [CasperLabs][casperlabs].
Along with Krzysztof Pobiarżyn and Kuba Płaskonka, we formed an engineering team dedicated to smart contracts.

Looking at the blockchain ecosystems from the smart contract developer perspective there are two universes.
The first one is Solidity, which thrives and is at its best now.
It has a ton of well-tested code and security tooling.
Whenever an EVM-based blockchain pops out it gets populated by forks of DeFi and DAO protocols.
Fascinating network effect emerges - code written for one EVM-based blockchain can be run on every other EVM-based blockchain.
The second universe is Rust which compiles to WebAssembly.
Here developer communities live in the guarded cities of Polkadot, Cosmos, Solana, Casper, and Near. 
The code written for one platform is not portable.
The network effect never had a chance to arise.

The main reason why Odra exists is achieving this cross-chain code reusability.
We could paraphrase a bit and say:
"One to bring them all and in the code bind them."

## Odra for Casper
The very first blockchain we have integrated with Odra is Casper.
In comparison to [casper-contract][casper-contract] API, it greatly cuts development time and offers a much lower entry level.
The Odra interface is developer friendly and people familiar with Solidity, [Ink][ink], or [Near][near-sdk] will feel like at home.
We hope it will unleash the creativity and bring a whole bunch of products onto Casper.

## Odra Framework

Odra is a high-level smart contract framework for Rust, which encourages rapid development and clean, pragmatic design.
Built by experienced developers, it takes care of much of the hassle of smart contract development, enabling you to focus on writing your dapp without reinventing the wheel.
It's free and open source.

Odra's goal is to become the go-to smart contract framework for all WebAssembly-based blockchains. 

A smart contract written using Odra can be executed on all integrated systems.
We can do it by abstracting over core concepts that all the above systems are built around. 
These are type system, storage, entry points, execution context, and testing environment.
We believe it will bring standardization to the development of Rust-based smart contracts and enable code reusability we have not yet seen in this ecosystem.

Let’s look at a Flipper contract, that holds a boolean value.
The contract has a constructor that sets the initial value, and two entry points: `flip()` and `get()`, to change and query the current value, respectively.

```rust
use odra::Variable;

#[odra::module]
pub struct Flipper {
    value: Variable<bool>,
}

#[odra::module]
impl Flipper {

    #[odra(init)]
    pub fn init(&mut self, value: bool) {
        self.value.set(value);
    }

    pub fn flip(&mut self) {
        self.value.set(!self.get());
    }

    pub fn get(&self) -> bool {
        self.value.get_or_default()
    }
}
```

It comes with the CLI tool [cargo-odra] that makes it easy to use Odra.

![cargo-odra](./cargo_odra.gif)

Neat and simple, isn't it? Do you like it? Start flowing with us!

## What next

Let's be honest, we are just starting.
The codebase is still hot.
On the other hand, we are happy with the interfaces we designed.
Now is the time to write documentation and tutorials.
We are also building the modules library inspired by [OpenZeppelin][open-zeppelin].
The security code audit is still ahead of us.

## Join us

Check out the [Odra GitHub repository][odra-repo] for more info on how to get the most out of Odra. 
Should you have questions, join [our Discord][odra-discord], [our Twitter][odra-twitter] or write us at contact@odra.dev.

[casperlabs]:      https://casperlabs.io
[odra-repo]:       https://github.com/odradev/odra
[odra-discord]:    https://discord.gg/Mm5ABc9P8k
[odra-twitter]:    https://twitter.com/odradev
[casper-contract]: https://crates.io/crates/casper-contract
[ink]:             https://crates.io/crates/ink_lang
[near-sdk]:        https://crates.io/crates/near-sdk
[open-zeppelin]:   https://github.com/OpenZeppelin/openzeppelin-contracts/
