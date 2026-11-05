---
sidebar_position: 3
description: Step-by-step Odra setup on macOS, for Apple silicon and Intel.
---

# macOS setup

The [Installation](installation.md) page lists *what* Odra needs. This page is the concrete command
list for macOS, on both Apple silicon and Intel.

:::tip
If you use an AI coding agent, the [Odra Claude Code plugin](https://github.com/odradev/odradev-plugins)
automates this: `/odra-plugin:check-env` reports exactly which of the steps below are missing.
:::

## Step 1 - Xcode Command Line Tools

```bash
xcode-select --install
```

This provides `cc`, the linker Rust shells out to for every build. Without it even
`cargo install cargo-odra` stops at `error: linker 'cc' not found`.

You do not need the full Xcode app. If the tools are already installed, the command tells you so,
and `xcode-select -p` prints their location.

## Step 2 - Homebrew

Skip this if `brew --version` already works.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

On **Apple silicon** Homebrew installs to `/opt/homebrew`, which is not on the default `PATH`. Add it:

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

On **Intel** Macs Homebrew installs to `/usr/local`, which is already on `PATH`, so this step is not
needed.

## Step 3 - Packages

```bash
brew install binaryen wabt openssl@3
```

| Formula | Provides | Why it is needed |
| --- | --- | --- |
| `binaryen` | `wasm-opt` | Optimizes the compiled contract. Must be 121 or newer; Homebrew's is current. |
| `wabt` | `wasm-strip` | Removes debug sections from the compiled contract. |
| `openssl@3` | OpenSSL | Build dependency of `cargo-odra`. |

Verify the two wasm tools:

```bash
wasm-opt --version
wasm-strip --version
```

## Step 4 - Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
. "$HOME/.cargo/env"
```

Install Rust through [rustup](https://rustup.rs/), not `brew install rust`. Odra projects pin a
specific nightly toolchain in a `rust-toolchain` file, and only rustup can switch to it.

The `. "$HOME/.cargo/env"` line puts `cargo` on your `PATH` for the current shell; the installer
already added it to your shell profile for future sessions. Under **fish**, the file to source is
`"$HOME/.cargo/env.fish"` instead - the installer prints the right line for your shell.

## Step 5 - cargo-odra

```bash
cargo install cargo-odra --locked
cargo odra --version
```

This compiles from source and takes a few minutes.

## Step 6 - Create a project

```bash
cargo odra new --name my_project --template full && cd my_project
```

The project name must be a valid Rust package name - lowercase, underscores, no hyphens. `full` gives
you one crate with a sample `Flipper` contract, tests and a CLI binary; `cargo odra list-templates`
shows the alternatives.

## Step 7 - The wasm target, from inside the project

```bash
# run this from inside the project directory
rustup target add wasm32-unknown-unknown
```

**The directory matters.** The generated project pins a nightly toolchain in its `rust-toolchain`
file, and `rustup target add` applies to whichever toolchain is active *in the current directory*.
Run it from your home directory and the target is added to `stable`, while the project keeps building
with the pinned nightly - which still does not have it:

```
🤦  ERROR : wasm32-unknown-unknown target is not present, install it by executing:
rustup target add wasm32-unknown-unknown
```

Running the command you were just told to run then appears to change nothing. Run it inside the
project and it applies to the right toolchain.

Check it landed where you expect:

```bash
rustup target list --installed --toolchain "$(cat rust-toolchain)"
```

`wasm32-unknown-unknown` must be in that list.

## Step 8 - Run the tests

```bash
cargo odra test
```

This runs against [OdraVM](../backends/02-odra-vm.md), the in-memory backend. It needs neither the
wasm target nor `wasm-opt`, so it is the fastest way to confirm the toolchain works. The first run
downloads the pinned nightly toolchain and compiles the whole framework, so expect it to take a
while; later runs are seconds.

```bash
cargo odra test -b casper
```

This one compiles the contract to wasm, runs `wasm-opt` and `wasm-strip` over it, and executes the
same tests on [CasperVM](../backends/03-casper.md). Both should end with:

```
test result: ok. 1 passed; 0 failed; 0 ignored
```

If they do, your environment is complete.

A full setup uses several gigabytes, most of it the toolchains in `~/.rustup` and the project's
`target/` directory. `cargo odra clean` reclaims the latter.

## All of it in one block

```bash
xcode-select --install

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
eval "$(/opt/homebrew/bin/brew shellenv)"

brew install binaryen wabt openssl@3

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
. "$HOME/.cargo/env"

cargo install cargo-odra --locked
cargo odra new --name my_project --template full && cd my_project
rustup target add wasm32-unknown-unknown

cargo odra test
cargo odra test -b casper
```

## Troubleshooting

| What you see | What it means | Fix |
| --- | --- | --- |
| `error: linker 'cc' not found` | No C toolchain | `xcode-select --install` |
| `xcrun: error: invalid active developer path` | Command Line Tools missing or unlinked after an OS upgrade | `xcode-select --install` |
| `brew: command not found` in a new terminal | Homebrew's `/opt/homebrew` is not on `PATH` | `eval "$(/opt/homebrew/bin/brew shellenv)"`, and add it to `~/.zprofile` |
| `Could not find directory of OpenSSL installation` | `openssl-sys` cannot locate OpenSSL | `brew install openssl@3` |
| `wasm32-unknown-unknown target is not present` | Target added to the wrong toolchain | Re-run `rustup target add wasm32-unknown-unknown` from inside the project directory |
| `Unknown option '--llvm-memory-copy-fill-lowering'` followed by `error while running wasm-opt` | `wasm-opt` older than 121 | `brew install binaryen`, then check `which -a wasm-opt` for an older one earlier on `PATH` |
| `There was an error while running wasm-opt - is it installed?` with no other output | `wasm-opt` missing | `brew install binaryen` |
| `There was an error while running wasm-strip - is it installed?` | `wasm-strip` missing | `brew install wabt` |
| `cargo: command not found` in a new terminal | rustup's `PATH` entry not loaded | `. "$HOME/.cargo/env"` - or `source "$HOME/.cargo/env.fish"` under fish |

## What's next

- [Flipper example](flipper.md) - the contract you just tested, explained
- [Directory structure](../basics/02-directory-structure.md) - what `cargo odra new` generated
- [Livenet](../backends/04-livenet.md) - deploying to a real network
