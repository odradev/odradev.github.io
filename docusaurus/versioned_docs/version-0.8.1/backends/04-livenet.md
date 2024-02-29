---
sidebar_position: 3
---

# Livenet

The Livenet backend let us deploy and test the contracts on the real blockchain. It can be a local
test node, a testnet or even the mainnet. It is possible and even recommended using the Livenet backend
to handle the deployment of your contracts to the real blockchain.

Furthermore, it is implemented in a similarly to Casper or OdraVM,
however, it uses a real blockchain to deploy contracts and store the state.
This lets us use Odra to deploy and test contracts on a real blockchain, but
on the other hand, it comes with some limitations on what can be done in the tests.

The main differences between Livenet and e.g. CasperVM backend are:
- Real CSPR tokens are used to deploy and call contracts. This also means that we need to
pay for each contract deployment and each contract call. Of course, we can use the [faucet](https://testnet.cspr.live/tools/faucet)
to get some tokens for testing purposes, but we still need to specify the amount needed
for each action.
- The contract state is stored on the real blockchain, so we can't just reset the state - 
we can redeploy the contract, but we can't remove the old one.
- Because of the above, we can load the existing contracts and use them in the tests.
- We have no control over the block time. This means that for example, `advance_block_time` function
is implemented by waiting for the real time to pass.

This is also a cause for the fact that the Livenet backend cannot be (yet) used for running
the regular Odra tests. Instead, we can create integration tests or binaries which will
use a slightly different workflow to test the contracts.

## Setup

To use Livenet backend, we need to provide Odra with some information - the network address, our private
key and the name of the chain we want to use. Optionally, we can add multiple private keys to use
more than one account in our tests. Those values are passed using environment variables. We can use .env
file to store them - let's take a look at an example .env file, created from the [.env.sample] file from
examples folder:

```env
# Path to the secret key of the account that will be used
# to deploy the contracts.
# We're using .keys folder so we don't accidentally commit
# the secret key to the repository.
ODRA_CASPER_LIVENET_SECRET_KEY_PATH=.keys/secret_key.pem

# RPC address of the node that will be used to deploy the contracts.
ODRA_CASPER_LIVENET_NODE_ADDRESS=localhost:7777

# Chain name of the network. Known values:
# - integration-test
ODRA_CASPER_LIVENET_CHAIN_NAME=integration-test

# Paths to the secret keys of the additional accounts.
# Main secret key will be 0th account.
ODRA_CASPER_LIVENET_KEY_1=.keys/secret_key_1.pem
ODRA_CASPER_LIVENET_KEY_2=.keys/secret_key_2.pem
```

With the proper value in place, we can write our tests or deploy scenarios. In the examples, we can find
a simple binary that deploys a contract and calls it. The test is located in the [erc20_on_livenet.rs] file.
Let's go through the code:

```rust
fn main() {
    // Similar to the OdraVM backend, we need to initialize
    // the environment:
    let env = odra_casper_livenet_env::env();

    // Most of the for the host env works the same as in the
    // OdraVM backend.
    let owner = env.caller();
    // Addresses are the real addresses on the blockchain,
    // so we need to provide them
    // if we did not import their secret keys.
    let recipient = 
        "hash-2c4a6ce0da5d175e9638ec0830e01dd6cf5f4b1fbb0724f7d2d9de12b1e0f840";
    let recipient = Address::from_str(recipient).unwrap();

    // Arguments for the contract init method.
    let name = String::from("Plascoin");
    let symbol = String::from("PLS");
    let decimals = 10u8;
    let initial_supply: U256 = U256::from(10_000);
    
    // The main difference between other backends - we need to specify
    // the gas limit for each action.
    // The limit will be used for every consecutive action
    // until we change it.
    env.set_gas(100_000_000_000u64);
    
    // Deploy the contract. The API is the same as in the OdraVM backend.
    let init_args = Erc20InitArgs {
        name,
        symbol,
        decimals,
        initial_supply: Some(initial_supply)
    };
    let mut token = Erc20HostRef::deploy(env, init_args);
    
    // We can now use the contract as we would in the OdraVM backend.
    println!("Token address: {}", token.address().to_string());

    // Uncomment to load existing contract.
    // let address = "hash-d26fcbd2106e37be975d2045c580334a6d7b9d0a241c2358a4db970dfd516945";
    // let address = Address::from_str(address).unwrap();
    // We use the Livenet-specific `load` method to load the contract
    // that is already deployed.
    // let mut token = Erc20Deployer::load(env, address);

    // Non-mutable calls are free! Neat, huh? More on that later.
    println!("Token name: {}", token.name());

    // The next call is mutable, but the cost is lower that the deployment,
    // so we change the amount of gas
    env.set_gas(3_000_000_000u64);
    token.transfer(recipient, U256::from(1000));

    println!("Owner's balance: {:?}", token.balance_of(owner));
    println!("Recipient's balance: {:?}", token.balance_of(recipient));
}
```

:::note
The above example is a rust binary, not a test. Note that it is also added as a section of the
`Cargo.toml` file:
```toml
[bin]
name = "erc20_on_livenet"
path = "src/bin/erc20_on_livenet.rs"
required-features = ["livenet"]
test = false
```
:::

## Usage

To run the above code, we simply need to run the binary with the `livenet` feature enabled:

```bash
cargo run --bin erc20_on_livenet --features=livenet
```

A part of a sample output should look like this:

```bash
...
💁  INFO : Calling "hash-d26fcbd210..." with entrypoint "transfer".
🙄  WAIT : Waiting 15s for "65b1a5d21...".
🙄  WAIT : Waiting 15s for "65b1a5d21...".
💁  INFO : Deploy "65b1a5d21..." successfully executed.
Owner's balance: 4004
Recipient's balance: 4000
```
Those logs are a result of the last 4 lines of the above listing.
Each deployment or a call to the blockchain will be noted and will take some time to execute.
We can see that the `transfer` call took over 15 seconds to execute. But calling `balance_of` was nearly instant
and cost us nothing. How it is possible?

:::info
You can see the deployment on http://cspr.live/ - the transfer from the example
can be seen [here](https://integration.cspr.live/deploy/65b1a5d21174a62c675f89683aba995c453b942c705b404a1f8bbf6f0f6de32a).
:::

## How Livenet backend works
All calls of entrypoints executed on a Casper blockchain cost gas - even if they do not change the state.
It is possible however to query the state of the blockchain for free.

This principle is used in the Livenet backend - all calls that do not change the state of the blockchain are really executed offline - the only thing that is requested from the
node is the current state. This is why the `balance_of` call was almost instant and free.

Basically, if the entrypoint function is not mutable or does not make a call to an unknown external contract
(see [Cross Calls](../basics/10-cross-calls.md)), it is executed offline and
node is used for the state query only. However, the Livenet needs to know the connection between the contracts
and the code, so make sure to deploy or load already deployed contracts

## Multiple enviroments

It is possible to have multiple environments for the Livenet backend. This is useful if we want to easily switch between multiple accounts,
multiple nodes or even multiple chains.

To do this, simply create a new `.env` file with a different prefix - for example, `integration.env` and `mainnet.env`.
Then, pass the `ODRA_CASPER_LIVENET_ENV` variable with value either `integration` or `mainnet` to select which file
has to be used first. If your `integration.env` file has a value that IS present in the `.env` file, it will
override the value from the `.env` file.

```bash
ODRA_CASPER_LIVENET_ENV=integration cargo run --bin erc20_on_livenet --features=livene
```

To sum up - this command will firstly load the `integration.env` file and then load the missing values from `.env` file.

[.env.sample]: https://github.com/odradev/odra/blob/release/0.8.0/examples/.env.sample
[erc20_on_livenet.rs]: https://github.com/odradev/odra/blob/release/0.8.0/examples/bin/erc20_on_livenet.rs