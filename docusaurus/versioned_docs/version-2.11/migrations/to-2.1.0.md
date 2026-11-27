---
sidebar_position: 5
description: Migration guide to v2.1.0
---

# Migration guide to v2.1.0 from 2.0.*

The Odra v2.1.0 does not introduce any breaking changes in the smart contract code but rather focuses on the improvements in the developer experience. The most notable change is the introduction of the `odra` CLI tool, which simplifies the process of building, testing, and deploying smart contracts.

The only changes you need to make in your smart contract is the test code.

## Updating the test code

Function that required an event reference as an argument has been changed to accept an event type instead.

```rust title=before.rs
assert!(test_env.emitted_event(
    &party_contract,
    &PartyStarted {
        caller: test_env.get_account(0),
        block_time: 0
    }
));
```

```rust title=after.rs
assert!(test_env.emitted_event(
    &party_contract,
    PartyStarted {
        caller: test_env.get_account(0),
        block_time: 0
    }
));
```

In the previous version, the `HostRef` and `Addressable` traits both included a function called `address`, which may have caused confusion and led to exporting the `address` function from the wrong trait. In the updated version, address is now defined only in the `Addressable` trait, while the `HostRef` trait provides a separate function called `contract_address` instead.
