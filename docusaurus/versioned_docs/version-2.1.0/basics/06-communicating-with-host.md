---
sidebar_position: 6
description: How to get information from the Host
---

# Host Communication

One of the things that your contract will probably do is to query the host for some information -
what is the current time? Who called me? Following example shows how to do this:

```rust title="examples/src/features/host_functions.rs"
use odra::prelude::*;

#[odra::module]
pub struct HostContract {
    name: Var<String>,
    created_at: Var<u64>,
    created_by: Var<Address>
}

#[odra::module]
impl HostContract {
    pub fn init(&mut self, name: String) {
        self.name.set(name);
        self.created_at.set(self.env().get_block_time());
        self.created_by.set(self.env().caller())
    }

    pub fn name(&self) -> String {
        self.name.get_or_default()
    }
}
```

As you can see, we are using `self.env()`. It is an implementation of [`Module::env()`], autogenerated
by `#[odra::module]` attribute. The function returns a reference to the [`ContractEnv`] (you can read more in 
the [`Backend section`]). This is a structure that provides access to the host functions and variables. 

In this example, we use two of them:
* `get_block_time()` - returns the current block time as u64. 
* `caller()` - returns an Odra `Address` of the caller (this can be an external caller or another contract).

:::info
You will learn more functions that Odra exposes from host and types it uses in further articles.
:::

## What's next
In the next article, we'll dive into testing your contracts with Odra, so you can check that the code
we presented in fact works!

[`Module::env()`]: https://docs.rs/odra/2.1.0/odra/module/trait.Module.html#tymehtod.env
[`ContractEnv`]: https://docs.rs/odra/2.1.0/odra/struct.ContractEnv.html
[`Backend section`]: ../backends/01-what-is-a-backend.md#contract-env