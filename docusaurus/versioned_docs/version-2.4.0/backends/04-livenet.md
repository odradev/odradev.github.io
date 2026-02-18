---
sidebar_position: 3
---

# Livenet

The Livenet backend lets us deploy and test the contracts on the real blockchain. It can be a local
test node, a testnet or even the mainnet. It is possible and even recommended using the Livenet backend
to handle the deployment of your contracts to the real blockchain.

Furthermore, it is implemented similarly to Casper or OdraVM,
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
file to store them - let's take a look at an example .env file, created from the [.env.sample] file from the examples folder:

```env
# .env file used by Livenet integration. You can use multiple .env files to manage deploys on multiple chains
# by naming them casper-test.env, casper-livenet.env, etc. and calling the deploy script with the name of the
# ennviroment provided in the "ODRA_CASPER_LIVENET_ENV" variable. For example:
# ODRA_CASPER_LIVENET_ENV=casper-test cargo run --bin livenet_tests --features livenet
# This will load integration.env file first, and then fill the missing values with the values from casper-test.env.

# Path to the secret key of the account that will be used to deploy the contracts.
# If you are using the nctl, you can use the following command to extract the secret key from the container:
#    docker exec mynctl /bin/bash -c "cat /home/casper/casper-nctl/assets/net-1/users/user-1/secret_key.pem" > examples/.node-keys/secret_key.pem
#   docker exec mynctl /bin/bash -c "cat  /home/casper/casper-nctl/assets/net-1/users/user-2/secret_key.pem" > examples/.node-keys/secret_key_1.pem
ODRA_CASPER_LIVENET_SECRET_KEY_PATH=<path to secret_key.pem>

# RPC address of the node that will be used to deploy the contracts.
# For CSPR.cloud, you can use the following addresses:
# - https://node.cspr.cloud
# - https://node.testnet.cspr.cloud
# For nctl, default is:
# - http://localhost:11101
ODRA_CASPER_LIVENET_NODE_ADDRESS=<node address>

# Events url
# For CSPR.cloud, you can use the following addresses:
# - https://node.cspr.cloud/events
# For nctl, default is:
# - http://localhost:18101/events
ODRA_CASPER_LIVENET_EVENTS_URL=<events url>

# Chain name of the network. The mainnet is "casper" and test net is "casper-test".
# The integration network uses the "integration-test" chain name.
# For nctl default is "casper-net-1"
 ODRA_CASPER_LIVENET_CHAIN_NAME=<chain_name>

# Optionally, paths to the secret keys of the additional acccounts. Main secret key will be 0th account.
# The following will work for nctl if you used the command above to extract the secret keys:
# ODRA_CASPER_LIVENET_KEY_1=./keys/secret_key_1.pem
#ODRA_CASPER_LIVENET_KEY_1=<path to secret_key_1.pem>

# If using CSPR.cloud, you can set the auth token here.
# CSPR_CLOUD_AUTH_TOKEN=

# Optionally, you can set the TTL for the deploys. Default is 5 minutes.
# ODRA_CASPER_LIVENET_TTL=
```

:::note
CSPR.cloud is a service that provides mainnet and testnet Casper nodes on demand.
:::

With the proper value in place, we can write our tests or deploy scenarios. In the examples, we can find
a simple binary that deploys a contract and calls it. The test is located in the [erc20_on_livenet.rs] file.
Let's go through the code:

```rust
//! Deploys an ERC20 contract and transfers some tokens to another address.
use odra::casper_types::U256;
use odra::host::{Deployer, HostEnv, HostRefLoader, InstallConfig};
use odra::prelude::*;
use odra_modules::erc20::{Erc20, Erc20HostRef, Erc20InitArgs};
use std::str::FromStr;

fn main() {
    let env = odra_casper_livenet_env::env();

    let owner = env.caller();
    let recipient = "hash-2c4a6ce0da5d175e9638ec0830e01dd6cf5f4b1fbb0724f7d2d9de12b1e0f840";
    let recipient = Address::from_str(recipient).unwrap();

    // Deploy new contract.
    let mut token = deploy_erc20(&env);
    println!("Token address: {}", token.address().to_string());

    // Uncomment to load existing contract.
    // let mut token = load_erc20(&env);

    println!("Token name: {}", token.name());

    env.set_gas(3_000_000_000u64);
    token.transfer(&recipient, &U256::from(1000));

    println!("Owner's balance: {:?}", token.balance_of(&owner));
    println!("Recipient's balance: {:?}", token.balance_of(&recipient));
}

/// Loads an ERC20 contract.
fn _load_erc20(env: &HostEnv) -> Erc20HostRef {
    let address = "hash-d26fcbd2106e37be975d2045c580334a6d7b9d0a241c2358a4db970dfd516945";
    let address = Address::from_str(address).unwrap();
    Erc20::load(env, address)
}

/// Deploys an ERC20 contract.
pub fn deploy_erc20(env: &HostEnv) -> Erc20HostRef {
    let name = String::from("Plascoin");
    let symbol = String::from("PLS");
    let decimals = 10u8;
    let initial_supply = Some(U256::from(10_000));

    let init_args = Erc20InitArgs {
        name,
        symbol,
        decimals,
        initial_supply
    };

    env.set_gas(450_000_000_000u64);
    // You may configure a deploy passing `InstallConfig`.
    // Erc20::deploy_with_cfg(env, init_args, InstallConfig::upgradable::<Erc20>())
    Erc20::deploy(env, init_args)
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

:::note
Before executing the binary, make sure you built a wasm file.
:::

A part of a sample output should look like this:

```bash
...
💁  INFO : Calling "contract-package-b796cf8e527472d7ced8c4f8db5adb30eb577176f4c7ce956675590e0cac4bb8" directly with entrypoint "transfer".
🙄  WAIT : Waiting 10 for V1(TransactionV1Hash(775913daa0ffbded9aaf2216942217d682f03d1c04e6e2560d1e4b3329ebd2d6)).
💁  INFO : Transaction "775913daa0ffbded9aaf2216942217d682f03d1c04e6e2560d1e4b3329ebd2d6" successfully executed.
🔗  LINK : 
Owner's balance: 9000
Recipient's balance: 1000
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
It is possible, however, to query the state of the blockchain for free.

This principle is used in the Livenet backend - all calls that do not change the state of the blockchain are really executed offline - the only thing that is requested from the
node is the current state. This is why the `balance_of` call was almost instant and free.

Basically, if the entrypoint function is not mutable or does not make a call to an unknown external contract
(see [Cross Calls](../basics/10-cross-calls.md)), it is executed offline and
node is used for the state query only. However, the Livenet needs to know the connection between the contracts
and the code, so make sure to deploy or load already deployed contracts

## Multiple environments

It is possible to have multiple environments for the Livenet backend. This is useful if we want to easily switch between multiple accounts,
multiple nodes or even multiple chains.

To do this, simply create a new `.env` file with a different prefix - for example, `integration.env` and `mainnet.env`.
Then, pass the `ODRA_CASPER_LIVENET_ENV` variable with value either `integration` or `mainnet` to select which file
has to be used first. If your `integration.env` file has a value that IS present in the `.env` file, it will
override the value from the `.env` file.

```bash
ODRA_CASPER_LIVENET_ENV=integration cargo run --bin erc20_on_livenet --features=livenet
```

To sum up - this command will firstly load the `integration.env` file and then load the missing values from `.env` file.

[.env.sample]: https://github.com/odradev/odra/blob/release/2.2.0/examples/.env.sample
[erc20_on_livenet.rs]: https://github.com/odradev/odra/blob/release/2.2.0/examples/bin/erc20_on_livenet.rs