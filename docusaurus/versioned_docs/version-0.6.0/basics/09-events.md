---
sidebar_position: 9
description: Creating and emitting Events
---

# Events

Different blockchains implement events in different ways. Odra lets you forget about it by introducing
Odra Events. Take a look:

```rust title="examples/src/features/events.rs"
use odra::{Event, contract_env};
use odra::types::{Address, BlockTime, event::OdraEvent};

#[odra::module(events = [PartyStarted])]
pub struct PartyContract {
}

#[derive(Event, PartialEq, Eq, Debug)]
pub struct PartyStarted {
    pub caller: Address,
    pub block_time: BlockTime,
}

#[odra::module]
impl PartyContract {
    #[odra(init)]
    pub fn init(&self) {
        PartyStarted {
            caller: contract_env::caller(),
            block_time: contract_env::get_block_time(),
        }.emit();
    }
}
```

We defined a new contract, which emits an event called `PartyStarted` when the contract is deployed.
To define an event, we derive an `Event` macro like this:

```rust title="examples/src/features/events.rs"
#[derive(Event, PartialEq, Eq, Debug)]
pub struct PartyStarted {
    pub caller: Address,
    pub block_time: BlockTime,
}
```

Among other things, it adds an `emit()` function to the struct, which allows you to emit the event simply
as that:

```rust title="examples/src/features/events.rs"
PartyStarted {
    caller: contract_env::caller(),
    block_time: contract_env::get_block_time(),
}.emit();
```

Some backends may need to know all the events at compilation time to register them once the contract is deployed. To register events, add an `events` attribute to the struct's `#[odra::module]` macro. 

The event collection process is recursive; if your module consists of other modules, and they have already registered their events, you don't need to add them to the parent module.

## Testing events

Odra's `test_env` comes with a handy macro `assert_events!` which lets you easily test the events that a given contract has emitted:

```rust title="examples/src/features/events.rs"
use odra::{assert_events, test_env};
use crate::features::events::PartyStarted;
use super::PartyContractDeployer;

#[test]
fn test_party() {
    let party_contract = PartyContractDeployer::init();
    assert_events!(
        party_contract,
        PartyStarted {
            caller: test_env::get_account(0),
            block_time: 0,
        }
    );
}
```

## What's next
Read the next article to learn how to call other contracts from the contract context.
