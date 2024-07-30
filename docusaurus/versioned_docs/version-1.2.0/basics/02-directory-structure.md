---
sidebar_position: 2
description: Files and folders in the Odra project
---

# Directory structure

After creating a new project using Odra and running the tests, you will be presented with the
following files and directories:

```
.
├── Cargo.lock
├── Cargo.toml
├── CHANGELOG.md
├── Odra.toml
├── README.md
├── rust-toolchain
├── src/
│   ├── flipper.rs
│   └── lib.rs
├── bin/
|   |── build_contract.rs
|   └── build_schema.rs
├── target/
└── wasm/
```

## Cargo.toml
Let's first take a look at `Cargo.toml` file:

```toml
[package]
name = "sample"
version = "0.1.0"
edition = "2021"

[dependencies]
odra = "1.1.0"

[dev-dependencies]
odra-test = "1.1.0"

[build-dependencies]
odra-build = "1.1.0"

[[bin]]
name = "sample_build_contract"
path = "bin/build_contract.rs"
test = false

[[bin]]
name = "sample_build_schema"
path = "bin/build_schema.rs"
test = false

[profile.release]
codegen-units = 1
lto = true

[profile.dev.package."*"]
opt-level = 3
```

By default, your project will use the latest odra version available at crates.io. For testing purposes, `odra-test` is also 
added as a dev dependency.

## Odra.toml
This is the file that holds information about contracts that will be generated when running `cargo odra build` and
`cargo odra test`:

```toml
[[contracts]]
fqn = "sample::Flipper"
```

As we can see, we have a single contract, its `fqn` (Fully Qualified Name) corresponds to
the contract is located in `src/flipper.rs`.
More contracts can be added here by hand, or by using `cargo odra generate` command.

## src/
This is the folder where your smart contract files live.

## bin/
This is the folder where scripts that will be used to generate code or schemas live.
You don't need to modify those files, they are generated by `cargo odra new` command and 
are used by `cargo odra build`, `cargo odra test` and `cargo odra schema` commands.

## target/
Files generated by cargo during the build process are put here.

## wasm/
WASM files generated by `cargo odra build` and `cargo odra test` are put here. You can grab those WASM files
and deploy them on the blockchain.

# What's next
Now, let's take a look at one of the files mentioned above in more detail,
namely the `Odra.toml` file.