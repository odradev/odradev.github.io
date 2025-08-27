---
sidebar_position: 10
---

# Deploying a Token on Casper Livenet
In this tutorial, we will take the token we created in
the previous one and deploy it on the Livenet Casper network,
using the Odra Livenet backend.

We will also take a look at the tools that Casper Ecosystem
provides to interact with our newly deployed token.

:::info
Most of this tutorial will work with any Casper contract.
:::

## Casper Wallet

We will be using Casper Wallet to do some tasks in this tutorial.
To install it, please follow the instructions on the [official website].

After setting up the wallet, extract the private key of the account
you want to use for our testing.
You can do this by clicking on the Menu > Download account keys.

:::warning
You are solely responsible for the security of your private keys.
We recommend creating a new account for the testing purposes.
:::

Why do we need the private key? We will use it in Odra to deploy
our contract to the Casper network using Livenet backend.

## Getting tokens
To deploy the contract on the Livenet, we need to have some CSPR.
The easiest way to get them is to use the faucet, which will send
us 1000 CSPR for free. Unfortunately, only on the Testnet.

To use the faucet, go to the [Casper Testnet Faucet].
Log in using your Casper Wallet account and click on the "Request Tokens" button.

:::note
One account can request tokens only once. If you run out of tokens, you can
either ask someone in the Casper community to send you some, or simply create a new account
in the wallet.
:::

Now, when we have the tokens, we can deploy the contract. Let's do it using Odra!

## Odra Livenet
Odra Livenet is described in detail in the
[backends section](../backends/livenet) of this documentation.
We will then briefly describe how to use set it up in this tutorial.

In your contract code, create a new file in the bin folder:

```rust title="bin/our_token_livenet.rs"
//! Deploys a new OurToken contract on the Casper livenet and mints some tokens for the tutorial
//! creator.
use std::str::FromStr;

use odra::casper_types::U256;
use odra::host::{Deployer, HostEnv, HostRef, HostRefLoader};
use odra::prelude::Address;
use ourcoin::token::{OurToken, OurToken, OurTokenInitArgs};

fn main() {
    // Load the Casper livenet environment.
    let env = odra_casper_livenet_env::env();

    // Caller is the deployer and the owner of the private key.
    let owner = env.caller();
    // Just some random address...
    let recipient = "hash-48bd92253a1370d1d913c56800296145547a243d13ff4f059ba4b985b1e94c26";
    let recipient = Address::from_str(recipient).unwrap();

    // Deploy new contract.
    let mut token = deploy_our_token(&env);
    println!("Token address: {}", token.address().to_string());
    
    env.set_gas(2_500_000_000u64);

    // Propose minting new tokens.
    token.propose_new_mint(recipient, U256::from(1_000));

    // Vote, we are the only voter.
    token.vote(true, U256::from(1_000));

    // Let's advance the block time by 11 minutes, as
    // we set the voting time to 10 minutes.
    // OH NO! It is the Livenet, so we need to wait real time...
    // Hopefully you are not in a hurry.
    env.advance_block_time(11 * 60 * 1000);

    // Tally the votes.
    token.tally();

    // Check the balances.
    println!("Owner's balance: {:?}", token.balance_of(&owner));
    println!(
        "Tutorial creator's balance: {:?}",
        token.balance_of(&recipient)
    );
}

/// Deploys a contract.
pub fn deploy_our_token(env: &HostEnv) -> OurTokenHostRef {
    let name = String::from("OurToken");
    let symbol = String::from("OT");
    let decimals = 0;
    let initial_supply = U256::from(1_000);

    let init_args = OurTokenInitArgs {
        name,
        symbol,
        decimals,
        initial_supply,
    };

    env.set_gas(400_000_000_000u64);
    OurToken::deploy(env, init_args)
    // OurToken::deploy_with_cfg(env, init_args, odra::host::InstallConfig {
    //     package_named_key: String::from("OurToken"),
    //     is_upgradable: true,
    //     allow_key_override: true,
    // })
}

/// Loads a contract. Just in case you need to load an existing contract later...
fn _load_our_token(env: &HostEnv) -> OurTokenHostRef {
    let address = "hash-XXXXX";
    let address = Address::from_str(address).unwrap();
    OurToken::load(env, address)
}
```

You can deploy a contract with the default configuration or with a custom configuration calling `deploy_with_cfg`.
Read more about [`InstallConfig`] in the Odra documentation.

In your `Cargo.toml` file, we need to add a new dependency, a feature and
register the new binary. In the end, it should look like this:

```toml title="Cargo.toml"
[package]
name = "ourcoin"
version = "0.1.0"
edition = "2021"

[dependencies]
odra = { version = "2.2.0", features = [], default-features = false }
odra-modules = { version = "2.2.0", features = [], default-features = false }
odra-casper-livenet-env = { version = "2.2.0", optional = true }

[dev-dependencies]
odra-test = { version = "2.2.0", features = [], default-features = false }

[build-dependencies]
odra-build = { version = "2.2.0", features = [], default-features = false }

[features]
default = []
livenet = ["odra-casper-livenet-env"]

[[bin]]
name = "ourcoin_build_contract"
path = "bin/build_contract.rs"
test = false

[[bin]]
name = "ourcoin_build_schema"
path = "bin/build_schema.rs"
test = false

[[bin]]
name = "our_token_livenet"
path = "bin/our_token_livenet.rs"
required-features = ["livenet"]

[profile.release]
codegen-units = 1
lto = true

[profile.dev.package."*"]
opt-level = 3
```

Finally, add the `.env` file with the following content:

```env title=".env"
# Path to the secret key of the account that will be used to deploy the contracts.
ODRA_CASPER_LIVENET_SECRET_KEY_PATH=folder_with_your_secret_key/secret_key.pem

# RPC address of the node that will be used to deploy the contracts.
# For CSPR.cloud, you can use the following addresses:
# - https://node.cspr.cloud
# - https://node.testnet.cspr.cloud
# For nctl, default is:
# - http://localhost:11101
ODRA_CASPER_LIVENET_NODE_ADDRESS=<node_address>

# Chain name of the network. The mainnet is "casper" and test net is "casper-test".
# The integration network uses the "integration-test" chain name.
# For nctl default is "casper-net-1"
ODRA_CASPER_LIVENET_CHAIN_NAME=<chain_name>

# Events url
# For CSPR.cloud, you can use the following addresses:
# - https://node.cspr.cloud/events
# For nctl, default is:
# - http://localhost:18101/events
ODRA_CASPER_LIVENET_EVENTS_URL=<events url>
```

Of course, you need to replace the secret key's path
with the path to the secret key file you downloaded from the Casper Wallet.

:::note
One of the problems you may encounter is that the node you are using
will be down or will not accept your calls. In this case, you will
have to find and use another node IP address.
:::

Now, we will run our code:

```bash
cargo run --bin our_token_livenet --features livenet
```

If everything is set up correctly, you should see the output similar to this:

```
cargo run --bin our_token_livenet --features livenet
   Compiling ourcoin v0.1.0 (/Users/kpob/workspace/odra/examples/ourcoin)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.33s
     Running `../../target/debug/our_token_livenet`
💁  INFO : Found wasm under "/Users/kpob/workspace/odra/examples/ourcoin/wasm/OurToken.wasm".
💁  INFO : Deploying "OurToken".
🙄  WAIT : Waiting 10 for V1(TransactionV1Hash(c856983e995c79d8459540bd9d29d196535f63ceb8bac0f73ea747c5c9c74d76)).
💁  INFO : Transaction "c856983e995c79d8459540bd9d29d196535f63ceb8bac0f73ea747c5c9c74d76" successfully executed.
🔗  LINK : https://testnet.cspr.live/transaction/c856983e995c79d8459540bd9d29d196535f63ceb8bac0f73ea747c5c9c74d76
💁  INFO : Contract "contract-package-e39aa2f8e4d509c0253dcd1709a9f08449477eef0f22f0ad5912fff327f509c8" deployed.
Token address: hash-e39aa2f8e4d509c0253dcd1709a9f08449477eef0f22f0ad5912fff327f509c8
💁  INFO : Calling "contract-package-e39aa2f8e4d509c0253dcd1709a9f08449477eef0f22f0ad5912fff327f509c8" directly with entrypoint "propose_new_mint".
🙄  WAIT : Waiting 10 for V1(TransactionV1Hash(2d1aafe8f06748c7cfaf7972caee6b701de7a817430b52a73215f5ad9a175e77)).
💁  INFO : Transaction "2d1aafe8f06748c7cfaf7972caee6b701de7a817430b52a73215f5ad9a175e77" successfully executed.
🔗  LINK : https://testnet.cspr.live/transaction/2d1aafe8f06748c7cfaf7972caee6b701de7a817430b52a73215f5ad9a175e77
💁  INFO : Calling "contract-package-e39aa2f8e4d509c0253dcd1709a9f08449477eef0f22f0ad5912fff327f509c8" directly with entrypoint "vote".
🙄  WAIT : Waiting 10 for V1(TransactionV1Hash(b565acd01c2ebbab78fa91a3f0091b849a037f1984ca4c996788b92fcd9521db)).
🙄  WAIT : Waiting 10 for V1(TransactionV1Hash(b565acd01c2ebbab78fa91a3f0091b849a037f1984ca4c996788b92fcd9521db)).
💁  INFO : Transaction "b565acd01c2ebbab78fa91a3f0091b849a037f1984ca4c996788b92fcd9521db" successfully executed.
🔗  LINK : https://testnet.cspr.live/transaction/b565acd01c2ebbab78fa91a3f0091b849a037f1984ca4c996788b92fcd9521db
💁  INFO : advance_block_time called - Waiting for 660000 ms
💁  INFO : Calling "contract-package-e39aa2f8e4d509c0253dcd1709a9f08449477eef0f22f0ad5912fff327f509c8" directly with entrypoint "tally".
🙄  WAIT : Waiting 10 for V1(TransactionV1Hash(8d24de09298522b028073be5ba05542bf4efd0f03d0e8771d5c5a727832eba94)).
🙄  WAIT : Waiting 10 for V1(TransactionV1Hash(8d24de09298522b028073be5ba05542bf4efd0f03d0e8771d5c5a727832eba94)).
💁  INFO : Transaction "8d24de09298522b028073be5ba05542bf4efd0f03d0e8771d5c5a727832eba94" successfully executed.
🔗  LINK : https://testnet.cspr.live/transaction/8d24de09298522b028073be5ba05542bf4efd0f03d0e8771d5c5a727832eba94
Owner's balance: 1000
Tutorial creator's balance: 1000
```

Congratulations, your contract is now deployed on the Casper network!
Before we move on, note the address of the token!

We will use it in the next section to interact with the token. In our case it is
`hash-e39aa2f8e4d509c0253dcd1709a9f08449477eef0f22f0ad5912fff327f509c8`.

## Cspr.live

The first thing we will do is to explore Casper's network block explorer,
[cspr.live]. We can put the address of our token in the search bar to find it.

:::note
If you deployed your contract on the Testnet, remember to make sure that the Testnet
network is selected in the dropdown menu in the top right corner.
:::

If everything is set up correctly, you should see the contract package's details.
Besides the owner, keys etc., you can also see the contract's metdata, if it
was developed using a standard that cspr.live supports.

Indeed, we can see that it detected that our contract is a CEP-18 token!
We see the name, symbol and total supply.
All the mentions of the contract on the website will use the token name instead
of the contract address.

![contract.png](../contract.png)

Additionally, on the Token Txs tab, we can see the transactions that happened
with the token. We can see the minting transaction we did in the previous section
and transfers done during the voting process.

![transactions.png](../transactions.png)

If we click on one of the accounts that recieved the tokens, we will go to the
account page. Here, on the Tokens tab, we can see all the tokens that the account
has - and OurToken is one of them!

If you wish, you can check the status of the contract deployed during the development
of this tutorial [here](https://testnet.cspr.live/contract-package/e39aa2f8e4d509c0253dcd1709a9f08449477eef0f22f0ad5912fff327f509c8).

## Transferring Tokens using Casper Wallet

Casper wallet can do much more than just logging in to the faucet, exporting
the private keys and transferring CSPR. It can also interact with the contracts
deployed on the network.

If you deployed the contract and left some OT tokens to yourself, you should see
them in the Casper Wallet window.

You should also be able to transfer them to another account!

![wallet.png](../wallet.png)

## Conclusion

We've successfully deployed a token on the Casper network and interacted with it
using the Odra backend and Casper Wallet. We've also learned how to use the
cspr.live block explorer to check the status of your contract.

Odra, Cspr.live and Casper Wallet are just a few of the tools that the Casper ecosystem 
provides. Feel free to explore them on [casperecosystem.io].


[official website]: https://www.casperwallet.io/
[cspr.live]: https://cspr.live/
[Casper Testnet Faucet]: https://testnet.cspr.live/tools/faucet
[casperecosystem.io]: https://casperecosystem.io/
[`InstallConfig`]: https://docs.rs/odra/2.2.0/odra/host/struct.InstallConfig.html
