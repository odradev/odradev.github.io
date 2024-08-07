# Building contracts manually

`cargo odra` is a great tool to build and test your contracts, but sometimes
 a better control over the parameters that are passed to the `cargo`
or the compiler is needed. 

This is especially useful when the project has multiple features, and there is a need
to switch between them during the building and testing.

Knowing that `cargo odra` is a simple wrapper around `cargo`, it is easy to replicate
the same behavior by using `cargo` directly.

## Building the contract manually

To build the contract manually, `cargo odra` uses the following command:

```bash
ODRA_MODULE=my_contract cargo build --release --target wasm32-unknown-unknown --bin my_project_build_contract
```

:::info
Odra uses the environment variable `ODRA_MODULE` to determine which contract to build.
:::

Assuming that project's crate is named `my_project`, this command will build
the `my_contract` contract in release mode and generate the wasm file.
The file will be put into the `target/wasm32-unknown-unknown/release` directory under
the name `my_project_build_contract.wasm`.

The Odra Framework expects the contracts to be placed in the `wasm` directory, and
to be named correctly, so the next step would be to move the file:

```bash
mv target/wasm32-unknown-unknown/release/my_project_build_contract.wasm wasm/my_contract.wasm
```

## Optimizing the contract

To lower the size of the wasm file, `cargo odra` uses the `wasm-strip` tool:

```bash
wasm-strip wasm/my_contract.wasm
```

To further optimize the wasm file, the `wasm-opt` tool is also used.
```bash
wasm-opt --signext-lowering wasm/my_contract.wasm -o wasm/my_contract.wasm
```

:::warning
This step is required, as the wasm file generated by the Rust compiler is not
fully compatible with the Casper execution engine.
:::

## Running the tests manually

To run the tests manually, Odra needs to know which backend to use.
To run tests against Casper backend, the following command needs to be used:

```bash
ODRA_BACKEND=casper cargo test
```

## Wrapping up

Let's say we want to build the `my_contract` in debug mode, run the tests against the
casper backend and use the `my-own-allocator` feature from our `my_project` project.

To do that, we can use the following set of commands:

```bash
ODRA_MODULE=my_contract cargo build --target wasm32-unknown-unknown --bin my_project_build_contract
mv target/wasm32-unknown-unknown/debug/my_project_build_contract.wasm wasm/my_contract.wasm
wasm-strip wasm/my_contract.wasm
wasm-opt --signext-lowering wasm/my_contract.wasm -o wasm/my_contract.wasm
ODRA_BACKEND=casper cargo test --features my-own-allocator
```
