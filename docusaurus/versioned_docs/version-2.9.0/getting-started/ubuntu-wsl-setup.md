---
sidebar_position: 2
description: Step-by-step Odra setup on a clean Ubuntu or WSL machine, including the packages Ubuntu does not ship in a usable version.
---

# Ubuntu / WSL setup

The [Installation](installation.md) page lists *what* Odra needs. This page is the concrete
command list for Ubuntu, including the two places where the obvious command is the wrong one.

Every command here was run on a **clean Ubuntu 26.04 LTS** with nothing preinstalled - no
compiler, no `curl`, no Rust - and ends with a passing test on both backends. The process is
identical on Ubuntu 24.04 and on Ubuntu running under WSL2 on Windows; the only difference between
releases is which version of `binaryen` apt offers, and on every current release that version is
too old to use (see Step 2).

:::tip
If you use an AI coding agent, the [Odra Claude Code plugin](https://github.com/odradev/odradev-plugins)
automates this: `/odra-plugin:check-env` reports exactly which of the steps below are missing.
:::

## Before you start (WSL only)

Skip this section on a native Ubuntu machine.

Install Ubuntu from an **administrator** PowerShell, then restart and create your Linux user when
prompted:

```powershell
wsl --install -d Ubuntu
```

`wsl --list --online` shows the available distributions if you want to pin a specific release.

Two things worth getting right before you build anything:

- **Keep the project in the Linux filesystem.** Work in `~/projects/...`, not in `/mnt/c/...`.
  Cargo builds write tens of thousands of small files, and doing that across the Windows filesystem
  boundary is dramatically slower.
- **Open the project with the WSL remote.** In VS Code, run `code .` from inside WSL, or use the
  *WSL* extension. Running Windows-side tooling against `\\wsl$\...` paths gets you the slow path
  again.

If you later want a local Casper node (`nctl`), install Docker Desktop on Windows and enable WSL
integration for your distribution - the Docker CLI then works from inside Ubuntu.

## Step 1 - System packages

```bash
sudo apt update
sudo apt install -y curl build-essential pkg-config libssl-dev wabt
```

| Package | Why it is needed |
| --- | --- |
| `curl` | Downloads the rustup installer. A minimal Ubuntu image does not have it. |
| `build-essential` | Provides `cc`, the linker Rust shells out to. Without it every build stops at `error: linker cc not found`. |
| `pkg-config`, `libssl-dev` | `cargo-odra` depends on `openssl-sys`, which locates OpenSSL through `pkg-config` at build time. |
| `wabt` | Provides `wasm-strip`, which removes debug sections from the compiled contract. The apt version is fine. |

## Step 2 - wasm-opt (binaryen)

**Do not install `binaryen` from apt.** The version Ubuntu ships is too old for the current
`cargo-odra`, and the resulting failure does not look like a version problem:

| Ubuntu | apt `binaryen` | Works? |
| --- | --- | --- |
| 24.04 LTS | 108 | No |
| 26.04 LTS | 120 | No |
| required | **121 or newer** | |

`cargo-odra` passes `--llvm-memory-copy-fill-lowering` to `wasm-opt` for any Rust toolchain built
after LLVM 20 landed, which means every toolchain you would use today. Binaryen only understands
that flag from version 121 on. With an older binaryen the build ends in:

```
Unknown option '--llvm-memory-copy-fill-lowering'
🤦  ERROR : There was an error while running wasm-opt - is it installed?
```

which is misleading - it *is* installed, it is just too old.

Install a current release from upstream instead:

```bash
curl -sL https://github.com/WebAssembly/binaryen/releases/download/version_131/binaryen-version_131-x86_64-linux.tar.gz -o /tmp/binaryen.tar.gz
sudo tar xzf /tmp/binaryen.tar.gz -C /usr/local --strip-components=1
wasm-opt --version
```

On ARM (Apple silicon VMs, Ampere instances) use the `aarch64-linux` asset instead. Newer releases
are listed on the [binaryen releases page](https://github.com/WebAssembly/binaryen/releases) -
anything from 121 up works.

## Step 3 - Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
. "$HOME/.cargo/env"
```

Install Rust through [rustup](https://rustup.rs/), not through `apt install rustc`. Odra projects
pin a specific nightly toolchain in a `rust-toolchain` file, and only rustup can switch to it.

The `. "$HOME/.cargo/env"` line puts `cargo` on your `PATH` for the current shell; the installer
already added it to your shell profile for future sessions. If a later step reports
`cargo: command not found`, you either skipped this line or need to open a new terminal.

## Step 4 - cargo-odra

```bash
cargo install cargo-odra --locked
cargo odra --version
```

This compiles from source and takes a few minutes on a typical laptop.

## Step 5 - Create a project

```bash
cargo odra new --name my_project && cd my_project
```

The project name must be a valid Rust package name - lowercase, underscores, no hyphens.

## Step 6 - The wasm target, from inside the project

```bash
# note: run this from inside the project directory
rustup target add wasm32-unknown-unknown
```

**The directory matters.** The generated project pins a nightly toolchain in its `rust-toolchain`
file, and `rustup target add` applies to whichever toolchain is active *in the current directory*.
Run it from your home directory and the target is added to `stable`, while the project keeps
building with the pinned nightly - which still does not have it:

```
🤦  ERROR : wasm32-unknown-unknown target is not present, install it by executing:
rustup target add wasm32-unknown-unknown
```

Running the command you were just told to run then appears to change nothing. Run it inside the
project and it applies to the right toolchain. The first run also downloads the pinned nightly
itself, so it takes a minute.

Check it landed where you expect:

```bash
rustup target list --installed --toolchain "$(cat rust-toolchain)"
```

`wasm32-unknown-unknown` must be in that list.

## Step 7 - Run the tests

```bash
cargo odra test
```

This runs against [OdraVM](../backends/02-odra-vm.md), the in-memory backend. It needs neither the
wasm target nor `wasm-opt`, so it is the fastest way to confirm the toolchain works. Expect a few
minutes on the first run - it compiles the whole framework - and seconds afterwards.

```bash
cargo odra test -b casper
```

This one compiles the contract to wasm, runs `wasm-opt` and `wasm-strip` over it, and executes the
same tests on [CasperVM](../backends/03-casper.md). Both should end with:

```
test result: ok. 1 passed; 0 failed; 0 ignored
```

If they do, your environment is complete.

## All of it in one block

For a fresh machine, or to paste into a Dockerfile or CI job:

```bash
sudo apt update
sudo apt install -y curl build-essential pkg-config libssl-dev wabt

curl -sL https://github.com/WebAssembly/binaryen/releases/download/version_131/binaryen-version_131-x86_64-linux.tar.gz -o /tmp/binaryen.tar.gz
sudo tar xzf /tmp/binaryen.tar.gz -C /usr/local --strip-components=1

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
. "$HOME/.cargo/env"

cargo install cargo-odra --locked
cargo odra new --name my_project && cd my_project
rustup target add wasm32-unknown-unknown

cargo odra test
cargo odra test -b casper
```

## Troubleshooting

| What you see | What it means | Fix |
| --- | --- | --- |
| `error: linker 'cc' not found` | No C toolchain | `sudo apt install build-essential` |
| `Currently this requires the pkg-config utility to find OpenSSL` | `openssl-sys` cannot locate OpenSSL | `sudo apt install pkg-config libssl-dev` |
| `wasm32-unknown-unknown target is not present` | Target added to the wrong toolchain | Re-run `rustup target add wasm32-unknown-unknown` from inside the project directory |
| `Unknown option '--llvm-memory-copy-fill-lowering'` followed by `error while running wasm-opt` | binaryen older than 121 | Install binaryen from [upstream releases](https://github.com/WebAssembly/binaryen/releases), not apt |
| `There was an error while running wasm-opt - is it installed?` with no other output | `wasm-opt` missing entirely | Step 2 |
| `There was an error while running wasm-strip - is it installed?` | `wasm-strip` missing | `sudo apt install wabt` |
| `cargo: command not found` in a new terminal | rustup's PATH entry not loaded | `. "$HOME/.cargo/env"`, or open a new login shell |
| `could not determine the current user, please set $USER` | `$USER` is unset - typical in containers and CI, not in a normal login shell | `export USER=$(id -un)` |

## What to expect

On the reference run - Ubuntu 26.04 from scratch on a 32-core machine - the whole sequence took
**183 seconds**, spent roughly like this:

| Step | Time |
| --- | --- |
| apt packages | 46 s |
| binaryen download | 7 s |
| rustup | 15 s |
| `cargo install cargo-odra` | 18 s |
| `cargo odra new` | 3 s |
| `rustup target add` (downloads the pinned nightly) | 15 s |
| `cargo odra test` (OdraVM, first build) | 61 s |
| `cargo odra test -b casper` (first wasm build) | 18 s |

The two compile steps scale with core count, so on a laptop expect them to take considerably
longer than shown - budget fifteen to twenty minutes for the whole thing. Everything after the
first build is seconds.

Disk usage afterwards, about **6 GB** in total:

| Path | Size |
| --- | --- |
| `~/.rustup` (stable + pinned nightly + wasm target) | 2.9 GB |
| `~/.cargo` (registry, sources, `cargo-odra`) | 449 MB |
| `my_project/target` (debug + release artifacts) | 2.8 GB |
| `my_project/wasm/Flipper.wasm` | 242 KB |

The `target/` directory grows quickly across projects. `cargo odra clean` reclaims it.

## What's next

- [Flipper example](flipper.md) - the contract you just tested, explained
- [Directory structure](../basics/02-directory-structure.md) - what `cargo odra new` generated
- [Livenet](../backends/04-livenet.md) - deploying to a real network, which is where Docker and a
  local `nctl` node come in
