---
sidebar_position: 6
description: How to get information from the Host
---

# Host Communication

One of the things that your contract will probably do is to query the host for some information -
what is the current time? Who called me? Following example shows how to do this:

```rust title="examples/src/docs/host.rs"
use odra::Variable;
use odra::types::{BlockTime, Address};

#[odra::module]
pub struct HostContract {
    name: Variable<String>,
    created_at: Variable<BlockTime>,
    created_by: Variable<Address>,
}

#[odra::module]
impl HostContract {
    #[odra(init)]
    pub fn init(&mut self, name: String) {
        self.name.set(name);
        self.created_at.set(odra::contract_env::get_block_time());
        self.created_by.set(odra::contract_env::caller())
    }

    pub fn name(&self) -> String {
        self.name.get_or_default()
    }
}
```

As you can see, we are calling functions from `odra::contract_env`. `get_block_time()` will return
the current block time wrapped in Odra type `Blocktime`. `caller()` will return an Odra `Address` of
a caller (this can be an external caller or another contract).

:::info
You will learn more functions that Odra exposes from host and types it uses in further articles.
:::

## What's next
In the next article, we'll dive into testing your contracts with Odra, so you can check that the code
we presented in fact works!
