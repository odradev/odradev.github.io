---
sidebar_position: 1
---

# What is a backend

In a simple terms, a backend is a way of compiling, running and testing your contract written using Odra framework.
This can be a piece of code allowing you to quickly check your code - like [MockVM](02-mock-vm.md),
or a complete virtual machine, spinning up a blockchain for you - like [CasperVM](03-casper.md).

Each backend has to come with two parts that Odra requires - Contract Env and Test Env

## Contract Env
The Contract Env is a simple interface that each backend needs to implement,
exposing features of the blockchain from the perspective of the contract.

It gives Odra a set of functions, which allows implementing more complex concepts -
for example, to implement [Mapping](../basics/05-storage-interaction.md),
Odra requires some kind of storage integration, namely `set_var`, `get_var`, `set_dict_value` and 
`get_dict_value`.
The exact implementation of those functions is a responsibility of a backend,
making Odra and its user free to implement the contract logic,
instead of messing with the blockchain internals.

Other functions from Contract Env include handling transfers, addresses, block time, errors and events.

## Test Env
Similarly to the Contract Env, the Test Env exposes a set of functions that allows the communication with
the backend from the outside world - really useful for implementing tests.

This ranges from interacting with the blockchain - by the means of functions like
`register_contract` and `advance_block_time_by`, to more test-oriented pieces of code -
for example `assert_exception` and `get_event`.