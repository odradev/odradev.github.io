---
slug: odra-cosmwasm
title: Odra + CosmWasm
authors: [kpob]
image: https://github.com/odradev.png
---

In November 2022 we released [the first version](../blog/2022-11-30-release-020/index.md) of the Odra Framework. It's time for the next big step in our framework development - a new platform integration. Meet Odra + CosmWasm.

<!--truncate-->

## CosmWasm

CosmWasm is a smart contract platform for building dApps on the Cosmos blockchain ecosystem.
The platform is designed as a module that can be integrated into the Cosmos SDK, enabling developers who are already building blockchains with the Cosmos SDK to easily incorporate CosmWasm smart contract functionality without the need to modify their existing code.

It uses the Rust programming language, so is potentially a perfect candidate for an Odra backend.
There are many blockchains like [Osmosis], [Secret Network], [Juno] that utilize CosmWasm.

## Show me your code

I would like to write a `Counter` smart contract that is CosmWasm compatible.
What are the requirements?

1. It should store a `u32` value. 
2. The initial value it set by the contract deployer.
3. The value can be incremented.
4. The value can read from the storage.
5. The contract can call another contract and increment its counter.

So let's write an Odra module first.

```rust title=counter.rs
use odra::{types::{Address, event::OdraEvent}, Variable, contract_env};
use self::events::{Init, ValueUpdated};

#[odra::module]
pub struct Counter {
    pub value: Variable<u32>
}

#[odra::module]
impl Counter {
    #[odra(init)]
    pub fn init(&mut self, value: u32) {
        self.value.set(value);
        <Init as OdraEvent>::emit(Init {
            value,
        });
    }

    pub fn increment(&mut self) {
        let old_value = self.value.get_or_default();
        let new_value = old_value + 1;
        self.value.set(new_value);
        
        <ValueUpdated as OdraEvent>::emit(ValueUpdated {
            old_value,
            new_value,
            operator: contract_env::caller()
        });
    }

    pub fn cross_increment(&mut self, counter_address: Address) {
        CounterRef::at(counter_address).increment();
    }

    pub fn get_value(&self) -> u32 {
        self.value.get_or_default()
    }
}

mod events {
    use odra::types::Address;

    #[derive(odra::Event)]
    pub struct ValueUpdated {
        pub old_value: u32,
        pub new_value: u32,
        pub operator: Address
    }
    
    #[derive(odra::Event)]
    pub struct Init {
        pub value: u32,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deploy() {
        let counter = CounterDeployer::init(10);
        assert_eq!(10, counter.get_value());
    }

    #[test]
    fn increment() {
        let mut counter = CounterDeployer::init(10);
        counter.increment();
        assert_eq!(11, counter.get_value());
    }
}
```
But wait, I mentioned CosmWasm, did I?

Here the beauty of Odra comes into play.

Let's use `cargo-odra`.
```bash
cargo odra build -b cosmos
```
And... that's it, congratulations! We have just written and build our first CosmWasm contract.
As you see, it is nothing different from building a contract for Casper. No additional code, we only changed the `-b` flag.

## Deploy
We have just built a wasm file, but is it really a fully functional contract?

As a battlefield let's choose [Juno Network] (if you would like to read more about smart contract development on Juno read this [Quick Start tutorial]). This is an arbitrary choice, each client is built upon a so-called Wasm Zone [wasmd], and its interface is alike.

Assuming you already know how to interact with Juno testnet, let's move to the fun part.

But before we go, to keep things simple, let's prepare a [justfile]. It'll make our interactions with the blockchain much  easier. See [full version].

```justfile title=justfile
NODE := "--node https://rpc.uni.juno.deuslabs.fi:443"
CHAIN_ID := "--chain-id uni-6"
QUERY_FLAGS := NODE + " " + CHAIN_ID
TRANSACTION_DEFAULTS := "--gas-prices 0.025ujunox --gas auto --gas-adjustment 1.3 --broadcast-mode block"
EXEC_FLAGS := NODE + " " + CHAIN_ID + " " + TRANSACTION_DEFAULTS

get-address NAME:
    junod keys show {{NAME}} | grep -o juno.*

store-wasm WASM_PATH SENDER:
    junod tx wasm store \
    {{WASM_PATH}} --from {{SENDER}} {{EXEC_FLAGS}}

init-contract CODE_ID VALUE SENDER CONTRACT_NAME:
    junod tx wasm instantiate \
    {{CODE_ID}} \
    `just run-args-parser '{"name": "init", "args": [ { "value" : {{VALUE}} }]}'` \
    --label '{{CONTRACT_NAME}}' --from {{SENDER}} \
    --admin `just get-address {{SENDER}}` \
    {{EXEC_FLAGS}}

exec-increment ADDRESS SENDER:
    junod tx wasm execute \
    {{ADDRESS}} \
    `just run-args-parser '{"name": "increment"}'` \
    --from {{SENDER}}  \
    {{EXEC_FLAGS}}

query-get-value ADDRESS:
    junod q wasm contract-state smart {{ADDRESS}} \
    `just run-args-parser '{"name": "get_value"}'` {{QUERY_FLAGS}}
```

Ok, we are ready to go.

First, a CosmWasm contract needs to be stored, technically is not a contract yet. Like a larva waiting to morph into a butterfly (sorry for that).

There are three ways to interact with a contract.
1. Instantiate - in other words, a constructor call. Once the contract is instantiated, it gets an address.
2. Execute - call an entrypoint that modifies the state.
3. Query - read the contract's state.
   
Now, let's take a look at how to do it using the tools we have just prepared.

```bash
# args: 
#   the path to a wasm file,
#   the name under we store the private key.
just store-wasm counter.wasm odra
# args: 
# code id taken from the previous tx, 
# counter initial value, 
# named private key,
# contract label.
just init-contract 200 1 odra "My Counter"
# args:
# contract address taken from the previous tx,
# named private key
just exec-increment juno1k7x82... odra
# args:
# contract address
query-get-value juno1k7x82...
```

## Show me your transaction
I get it, you don't want to do it all by yourself. Let me prove to you it worked by showing one of my transactions.

```bash
junod q tx 4E500E27FAB3C38CF15066C3246F67AC8A73DE9948B762561EFE665F38B40923 --node https://rpc.uni.juno.deuslabs.fi:443 --chain-id uni-6
...
logs:
- events:
  - attributes:
    - key: _contract_address
      value: juno1k7x82egskkug8f2f03zhdlzs9tuexgjv7cqgg7mpyaxqkw4clgjq9mlat8
    type: execute
  - attributes:
    - key: action
      value: /cosmwasm.wasm.v1.MsgExecuteContract
    - key: module
      value: wasm
    - key: sender
      value: juno1le848rjac00nezzq46v5unxujaltdf270vhtfh
    type: message
  - attributes:
    - key: _contract_address
      value: juno1k7x82egskkug8f2f03zhdlzs9tuexgjv7cqgg7mpyaxqkw4clgjq9mlat8
    - key: action
      value: increment
    type: wasm
  - attributes:
    - key: _contract_address
      value: juno1k7x82egskkug8f2f03zhdlzs9tuexgjv7cqgg7mpyaxqkw4clgjq9mlat8
    - key: old_value
      value: "33"
    - key: new_value
      value: "34"
    - key: operator
      value: juno1le848rjac00nezzq46v5unxujaltdf270vhtfh
    type: wasm-ValueUpdated
...
txhash: 4E500E27FAB3C38CF15066C3246F67AC8A73DE9948B762561EFE665F38B40923
```

If you are familiar Cosmos ecosystem, you can see that there is an attribute containing
the performed action (`increment`) (If there were some parameters, they would be included in this attribute).
We can find here also our `ValueUpdated` event with its arguments `old_value`, `new_value` and `operator`.

Wow, we have it, everything worked as intended!

## Conclusion
Wouldn't it be great to replace [Casper Erc20] and [Cosmos Erc20] with a super-simple
single [Odra Erc20] implementation?

The `Counter` contract is just a POC, and there is still a long road ahead of us.
This simple example shows that features like storage, events, and cross-contract calls
can be unified in a simple readable interface.

CosmWasm integration hasn't been published yet, but if you want to experiment by yourself, 
check our GitHub (don't forget to update cargo-odra as well).

[Secret Network]: https://scrt.network/
[Osmosis]: https://docsosmosis.zone/
[Juno]: https://www.junonetwork.io/
[wasmd]: https://github.com/CosmWasm/wasmd
[`cargo-odra`]: https://odra.dev/docs/basics/cargo-odra
[Juno Network]: https://www.junonetwork.io/
[Quick Start tutorial]: https://medium.com/@NitroBiell/smart-contract-development-quick-start-on-juno-5dabf6fdcad0
[justfile]: https://github.com/casey/just
[full version]: https://github.com/odradev/odra/blob/feature/cosmos/odra-cosmos/juno-client/justfile
[Casper Erc20]: https://github.com/casper-ecosystem/erc20/tree/master/erc20/src
[Cosmos Erc20]: https://github.com/CosmWasm/cw-plus/tree/main/contracts/cw20-base/src
[Odra Erc20]: https://github.com/odradev/odra/blob/release/0.2.0/examples/src/erc20.rs
