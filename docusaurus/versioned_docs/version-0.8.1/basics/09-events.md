---
sidebar_position: 9
description: Creating and emitting Events
---

# Events

In the EVM world events are stored as logs within the blockchain's transaction receipts. These logs can be accessed by external applications or other smart contracts to monitor and react to specific events. Casper does not support events natively, however, Odra mimics this feature. Take a look:

```rust title="examples/src/features/events.rs"
use casper_event_standard::Event;
use odra::casper_event_standard;
use odra::prelude::*;
use odra::{Address, module::Module};

#[odra::module(events = [PartyStarted])]
pub struct PartyContract;

#[derive(Event, PartialEq, Eq, Debug)]
pub struct PartyStarted {
    pub caller: Address,
    pub block_time: u64
}

#[odra::module]
impl PartyContract {
    pub fn init(&self) {
        self.env().emit_event(PartyStarted {
            caller: self.env().caller(),
            block_time: self.env().get_block_time()
        });
    }
}
```

We defined a new contract, which emits an event called `PartyStarted` when the contract is deployed.
To define an event, add the `#[derive(Event)]` attribute like this:

```rust title="examples/src/features/events.rs"
#[derive(Event, PartialEq, Eq, Debug)]
pub struct PartyStarted {
    pub caller: Address,
    pub block_time: u64,
}
```

To emit an event, we use the `emit_event` function from the `ContractEnv`, passing the event as an argument:

```rust title="examples/src/features/events.rs"
self.env().emit_event(PartyStarted {
    caller: self.env().caller(),
    block_time: self.env().get_block_time()
});
```

To determine all the events at compilation time to register them once the contract is deployed. To register events, add an `events` attribute to the struct's `#[odra::module]` attribute.

The event collection process is recursive; if your module consists of other modules, and they have already registered their events, you don't need to add them to the parent module.

## Testing events

Odra's `HostEnv` comes with a few functions which lets you easily test the events that a given contract has emitted:

```rust title="examples/src/features/events.rs"
use super::{PartyContractHostRef, PartyStarted};
use odra::host::{Deployer, HostEnv, HostRef, NoArgs};

#[test]
fn test_party() {
    let test_env: HostEnv = odra_test::env();
    let party_contract = PartyContractHostRef::deploy(&test_env, NoArgs);
    test_env.emitted_event(
        party_contract.address(),
        &PartyStarted {
            caller: test_env.get_account(0),
            block_time: 0
        }
    );
    // If you do not want to check the exact event, you can use `emitted` function
    test_env.emitted(party_contract.address(), "PartyStarted");
    // You can also check how many events were emitted.
    assert_eq!(test_env.events_count(party_contract.address()), 1);
}
```

To explore more event testing functions, check the [`HostEnv`] documentation.

## What's next
Read the next article to learn how to call other contracts from the contract context.

[`HostEnv`]: https://docs.rs/odra/0.8.1/odra/host/struct.HostEnv.html
