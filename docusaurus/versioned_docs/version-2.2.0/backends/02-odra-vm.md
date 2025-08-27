---
sidebar_position: 2
---

# OdraVM

The OdraVM is a simple implementation of a mock backend with a minimal set of features that allows testing
the code written in Odra without compiling the contract to the target architecture and spinning up the
blockchain.

Thanks to OdraVM tests run a lot faster than other backends. You can even debug the code in real time -
simply use your IDE's debug functionality.

## Usage
The OdraVM is the default backend for Odra framework, so each time you run

```bash
cargo odra test
```

You are running your code against it.

## Architecture
OdraVM consists of two main parts: the `Contract Register` and the `State`.

The `Contract Register` is a list of contracts deployed onto the OdraVM, identified by an `Address`.

Contracts and Test Env functions can modify the `State` of the OdraVM.

Contrary to the "real" backend, which holds the whole history of the blockchain,
the OdraVM `State` holds only the current state of the OdraVM.
Thanks to this and the fact that we do not need the blockchain itself,
OdraVM starts instantly and runs the tests in the native speed.

## Execution

When the OdraVM backend is enabled, the `#[odra::module]` attribute is responsible for converting
your `pub` functions into a list of Entrypoints, which are put into a `Contract Container`.
When the contract is deployed, its Container registered into a Registry under an address.
During the contract call, OdraVM finds an Entrypoint and executes the code.

```mermaid
graph TD;
    id1[[Odra code]]-->id2[Contract Container];
    id2[Contract Container]-->id3((Contract Registry))
    id3((Contract Registry))-->id4[(OdraVM Execution)]
```