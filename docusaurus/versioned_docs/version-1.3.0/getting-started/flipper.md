---
sidebar_position: 2
---

# Flipper example

To quickly start working with Odra, take a look at the following code sample. If you followed the
[Installation](installation.md) tutorial, you should have this file already at `src/flipper.rs`.

For further explanation of how this code works, see [Flipper Internals](../basics/04-flipper-internals.md).

## Let's flip

```rust title="flipper.rs" showLineNumbers
use odra::Var;

/// A module definition. Each module struct consists Vars and Mappings
/// or/and another modules.
#[odra::module]
pub struct Flipper {
    /// The module itself does not store the value, 
    /// it's a proxy that writes/reads value to/from the host.
    value: Var<bool>,
}

/// Module implementation.
///
/// To generate entrypoints,
/// an implementation block must be marked as #[odra::module].
#[odra::module]
impl Flipper {
    /// Odra constructor, must be named `init`.
    ///
    /// Initializes the contract with the value of value.
    pub fn init(&mut self) {
        self.value.set(false);
    }

    /// Replaces the current value with the passed argument.
    pub fn set(&mut self, value: bool) {
        self.value.set(value);
    }

    /// Replaces the current value with the opposite value.
    pub fn flip(&mut self) {
        self.value.set(!self.get());
    }

    /// Retrieves value from the storage. 
    /// If the value has never been set, the default value is returned.
    pub fn get(&self) -> bool {
        self.value.get_or_default()
    }
}

#[cfg(test)]
mod tests {
    use crate::flipper::FlipperHostRef;
    use odra::host::{Deployer, NoArgs};

    #[test]
    fn flipping() {
        let env = odra_test::env();
        // To test a module we need to deploy it. `Flipper` automagically
        // implements `Deployer` trait, so we can use it to deploy the module.
        let mut contract = Flipper::deploy(&env, NoArgs);
        assert!(!contract.get());
        contract.flip();
        assert!(contract.get());
    }

    #[test]
    fn test_two_flippers() {
        let env = odra_test::env();
        let mut contract1 = Flipper::deploy(&env, NoArgs);
        let contract2 = Flipper::deploy(&env, NoArgs);
        assert!(!contract1.get());
        assert!(!contract2.get());
        contract1.flip();
        assert!(contract1.get());
        assert!(!contract2.get());
    }
}
```

## Testing

To run the tests, execute the following command:

```bash
cargo odra test # or add the `-b casper` flag to run tests on the CasperVM
```

## What's next
In the next category of articles, we will go through basic concepts of Odra.