---
sidebar_position: 11
description: Divide your code into modules
---

# Modules

Simply put, modules in Odra let you reuse your code between contracts or even projects. Every contract you
write is also a module, thanks to a macro `#[odra::module]`. This means that we can easily rewrite our math
example from the previous article, to use a single contract, but still separate our "math" code:

```rust title="examples/src/docs/modules.rs"
use crate::docs::cross_calls::MathEngine;

#[odra::module]
pub struct ModulesContract {
    pub math_engine: MathEngine,
}

#[odra::module]
impl ModulesContract {
    pub fn add_using_module(&self) -> u32 {
        self.math_engine.add(3, 5)
    }
}
```

Note that we didn't need to rewrite the MathEngine - we are using the contract from cross calls example as
a module!

:::info
To see how modules can be used in a real-world scenario, check out the ERC20 example in the main odra repository!
:::

## Testing
As we don't need to hold addresses, the test is really simple:

```rust title="examples/src/docs/modules.rs"
use super::ModulesContractDeployer;

#[test]
fn test_modules() {
    let modules_contract = ModulesContractDeployer::default();
    assert_eq!(modules_contract.add_using_module(), 8);
}
```

## What's next
We will see how to handle native token transfers.
