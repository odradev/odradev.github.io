---
sidebar_position: 1
---

# Installation

Hello fellow Odra user! This page will guide you through the installation process.

## Prerequisites
To start working with Odra, you need to have the following installed on your machine:

- Rust toolchain installed (see [rustup.rs](https://rustup.rs/))
- `wasm-strip` tool installed (see [wabt](https://github.com/WebAssembly/wabt))
- `wasm-opt` tool installed (see [binaryen](https://github.com/WebAssembly/binaryen))

We do not provide exact commands for installing these tools, as they are different for different operating systems.
Please refer to the documentation of the tools themselves.

:::tip
On **Ubuntu** - including Ubuntu under **WSL** on Windows - follow [Ubuntu / WSL setup](ubuntu-wsl-setup.md)
instead. It is the same process with the exact commands filled in, and it covers the two traps a
clean Ubuntu machine runs into: `binaryen` from apt is too old to work with `cargo-odra`, and
`rustup target add` has to be run from inside the project directory.
:::

With Rust toolchain ready, you can add a new target:

```bash
rustup target add wasm32-unknown-unknown
```

:::note
`wasm32-unknown-unknown` is a target that will be used by Odra to compile your smart contracts to WASM files.
:::

:::note
Odra projects pin a specific Rust **nightly** toolchain in a `rust-toolchain` file at the project root.
You do not need to install it yourself - rustup picks it up and downloads it on the first build, which
is why that build takes noticeably longer than the ones after it. If you prefer to add the wasm target
ahead of time for exactly that toolchain, run the command above from inside the project directory.
:::

## Installing Cargo Odra

[Cargo Odra](https://github.com/odradev/cargo-odra) is a helpful tool that will help you to build and test your smart contracts.
It is not required to use Odra, but the documentation will assume that you have it installed.

To install it, simply execute the following command:

```bash
cargo install cargo-odra --locked
```

To check if it was installed correctly and see available commands, type:

```bash
cargo odra --help
```

If everything went fine, we can proceed to the next step.

## Creating a new Odra project

To create a new project, simply execute:

```bash
cargo odra new --name my_project && cd my_project
```

This will create a new folder called `my_project` and initialize Odra there. Cargo Odra
will create a sample contract for you in `src` directory. You can run the tests of this contract
by executing:

```bash
cargo odra test
```

This will run tests using Odra's internal OdraVM. You can run those tests against a real backend, let's use CasperVM:

```bash
cargo odra test -b casper
```

**Congratulations!** Now you are ready to create contracts using Odra framework! If you had any problems during 
the installation process, feel free to ask for help on our [Discord](https://discord.com/invite/Mm5ABc9P8k).

## Setting up an AI coding agent

If you develop with [Claude Code](https://claude.com/claude-code), install the
[Odra plugin](https://github.com/odradev/odradev-plugins). It gives the agent skills for
scaffolding projects, writing and testing contracts, running a local NCTL node and deploying to
a livenet - so it follows Odra's conventions instead of guessing them:

```
/plugin marketplace add odradev/odradev-plugins
/plugin install odra-plugin@odradev-plugins
```

To enable it for everyone working on your project, commit this to `.claude/settings.json`
in the repository:

```json
{
  "extraKnownMarketplaces": {
    "odradev-plugins": {
      "source": {
        "source": "github",
        "repo": "odradev/odradev-plugins"
      }
    }
  },
  "enabledPlugins": {
    "odra-plugin@odradev-plugins": true
  }
}
```

Other agents can be pointed at [https://odra.dev/llms.txt](https://odra.dev/llms.txt), which
indexes every page of this documentation.

## What's next?
If you want to see the code that you just tested, continue to the description of [Flipper example](flipper).
