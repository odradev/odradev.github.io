---
sidebar_position: 12
description: Divide your code into modules
---

# Modules

Simply put, modules in Odra let you reuse your code between contracts or even projects. Every contract you
write is also a module, thanks to the `#[odra::module]` attribute. This means that we can easily rewrite our math
example from the previous article, to use a single contract, but still separate our "math" code:

```rust title="examples/src/features/modules.rs"
use crate::features::cross_calls::MathEngine;
use odra::prelude::*;

#[odra::module]
pub struct ModulesContract {
    pub math_engine: SubModule<MathEngine>
}

#[odra::module]
impl ModulesContract {
    pub fn add_using_module(&self) -> u32 {
        self.math_engine.add(3, 5)
    }
}
```

:::important
To use a module as a component of another module, you need to use the `SubModule` type. This is a special type
that crates a keyspace (read more in [Storage Layout]) and provide access to its public methods.
:::

Note that we didn't need to rewrite the `MathEngine` - we are using the contract from cross calls example as
a module!

:::info
To see how modules can be used in a real-world scenario, check out the [OwnedToken example] in the main Odra repository!
:::

## Testing
As we don't need to hold addresses, the test is really simple:

```rust title="examples/src/features/modules.rs"
#[cfg(test)]
mod tests {
    use super::ModulesContract;
    use odra::host::{Deployer, NoArgs};

    #[test]
    fn test_modules() {
        let test_env = odra_test::env();
        let modules_contract = ModulesContract::deploy(&test_env, NoArgs);
        assert_eq!(modules_contract.add_using_module(), 8);
    }
}
```

## What's next
We will see how to handle native token transfers.

[OwnedToken example]: https://github.com/odradev/odra/blob/release/1.1.0/examples/src/contracts/owned_token.rs
[Storage Layout]: ../advanced/04-storage-layout.md