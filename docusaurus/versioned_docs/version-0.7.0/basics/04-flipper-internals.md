---
sidebar_position: 4
description: Detailed explanation of the Flipper contract
---

# Flipper Internals
In this article, we take a deep dive into the code shown in the
[Flipper example](../getting-started/flipper.md), where we will explain in more detail all
the Odra-specific sections of the code.

## Header

```rust title="flipper.rs"
use odra::Variable;
```

Pretty straightforward. Odra wraps the code of the specific blockchains SDKs into its own implementation
that can be reused between targets. In the above case, we're importing `Variable`, which is responsible
for storing simple values on the blockchain's storage.

## Struct

```rust title="flipper.rs"
/// A module definition. Each module struct consists of Variables and Mappings
/// or/and other modules.
#[odra::module]
pub struct Flipper {
    /// The module itself does not store the value,
    /// it's a proxy that writes/reads value to/from the host.
    value: Variable<bool>,
}
```

In Odra, all contracts are also modules, which can be reused between contracts. That's why we need
to mark the struct with the `#[odra::module]` macro. In the struct definition itself, we state all
the fields of the contract. Those fields can be regular Rust data types, however - those will not
be persisted on the blockchain. They can also be Odra modules - defined in your project or coming
from Odra itself. Finally, to make the data persistent on the blockchain, you can use something like
`Variable<T>` showed above. To learn more about storage interaction, take a look at the
[next article](05-storage-interaction.md).

## Impl
```rust title="flipper.rs"
/// Module implementation.
///
/// To generate entrypoints,
/// an implementation block must be marked as #[odra::module].
#[odra::module]
impl Flipper {
    /// Odra constructor.
    ///
    /// Initializes the contract with the value of value.
    #[odra(init)]
    pub fn initial_settings(&mut self) {
        self.value.set(false);
    }
    ...
```
Similarly to the struct, we mark the `impl` section with the `#[odra::module]` macro. Odra will take all
`pub` functions from this section and create contract endpoints from them. So, if you wish to have
functions that are not available for calling outside the contract, do not make them public. Alternatively,
you can create a separate `impl` section without the macro - all functions defined there, even marked
with `pub` will be not callable.

The `#[odra(init)]` macro marks the constructor of the contract. This function will be limited to only
to a single call, all further calls to it will result in an error.

```rust title="flipper.rs"
    ...
    /// Replaces the current value with the passed argument.
    pub fn set(&mut self, value: bool) {
        self.value.set(value);
    }

    /// Replaces the current value with the opposite value.
    pub fn flip(&mut self) {
        self.value.set(!self.get());
    }
    ...
```
The endpoints above show you how to interact with the simplest type of storage - `Variable<T>`. The data
saved there using `set` function will be persisted in the blockchain.

## Tests
```rust title="flipper.rs"
#[cfg(test)]
mod tests {
    use crate::flipper::FlipperDeployer;

    #[test]
    fn flipping() {
        // To test a module we need to deploy it using autogenerated Deployer. 
        let mut contract = FlipperDeployer::initial_settings();
        assert!(!contract.get());
        contract.flip();
        assert!(contract.get());
    }
    ...
```
You can write tests in any way you prefer and know in Rust. In the example above we are deploying the
contract using `FlipperDeployer` - a piece of code generated automatically thanks to the macros.
The contract will be deployed on the VM you chose while running `cargo odra test`.

## What's next
Now let's take a look at the different types of storage that Odra provides and how to use them.
