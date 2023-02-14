---
sidebar_position: 1
---

# Installation

Hello fellow Odra user! This page will guide you through the installation process.

## Prerequisites
To start working with Odra, you need to have the following installed on your machine:

- Rust toolchain installed (see [rustup.rs](https://rustup.rs/))
- wasmstrip tool installed (see [wabt](https://github.com/WebAssembly/wabt))

We do not provide exact commands for installing these tools, as they are different for different operating systems.
Please refer to the documentation of the tools themselves.

With Rust toolchain ready, you can add a new target:

```bash
rustup target add wasm32-unknown-unknown
```

:::note
`wasm32-unknown-uknown` is a target that will be used by Odra to compile your smart contracts to WASM files.
:::

## Installing Cargo Odra

Cargo Odra is a helpful tool that will help you to build and test your smart contracts.
It is not required to use Odra, but the documentation will assume that you have it installed.

To install it, simply execute the following command:

```bash
cargo install cargo-odra
```

To check if it was installed correctly and see available commands, type:

```bash
cargo odra --help
```

If everything went fine, we can proceed to the next step.

## Creating a new Odra project

To create a new project, simply execute:

```bash
cargo odra new --name my-project && cd my-project
```

This will create a new folder called "my-project" and initialize Odra there. Cargo Odra
will create a sample contract for you in src directory. You can run the tests of this contract
by executing:

```bash
cargo odra test
```

This will run tests using Odra's internal MockVM. You can run those tests against a real backend, to do so
we need to add a new backend. Let's use CasperVM:

```bash
cargo odra backend add -p casper
```

Now we can run the tests against it:

```bash
cargo odra test -b casper
```

**Congratulations!** Now you are ready to create contracts using Odra framework! If you had any problems during 
the installation process, feel free to ask for help on our [Discord](https://discord.gg/8DuTpH6H).

## What's next?
If you want to see the code that you just tested, continue to the description of [Flipper example](flipper).

If you want to know what exactly happened behind the scenes, take a look at the [Architecture](../architecture/code-structure.md) chapter.