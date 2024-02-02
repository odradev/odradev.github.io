---
sidebar_position: 1
---

# What is a backend?

You can think of a backend as a target platform for your smart contract.
This can be a piece of code allowing you to quickly check your code - like [OdraVM](02-mock-vm.md),
a complete virtual machine, spinning up a blockchain for you - like [CasperVM](03-casper.md),
or even a real blockchain - when using [Livenet backend](03-casper.md).

Each backend has to come with two parts that Odra requires - the Contract Env and the Host Env.

## Contract Env
The Contract Env is a simple interface that each backend needs to implement,
exposing features of the blockchain from the perspective of the contract.

It gives Odra a set of functions, which allows implementing more complex concepts -
for example, to implement [Mapping](../basics/05-storage-interaction.md),
Odra requires some kind of storage integration.
The exact implementation of those functions is a responsibility of a backend,
making Odra and its user free to implement the contract logic,
instead of messing with the blockchain internals.

Other functions from Contract Env include handling transfers, addresses, block time, errors and events.

## Host Env
Similarly to the Contract Env, the Host Env exposes a set of functions that allows the communication with
the backend from the outside world - really useful for implementing tests.

This ranges from interacting with the blockchain - like deploying and calling the contracts,
to the more test-oriented - handling errors, forwarding the block time, etc.

## What's next
We will take a look at backends Odra implements in more detail.