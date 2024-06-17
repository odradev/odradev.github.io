---
sidebar_position: 8
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Using Proxy Caller

In this tutorial, we will learn how to use the `proxy_caller` wasm to call an Odra [payable](../backends/03-casper.md#payable) function. The `proxy_caller` is a session code that top-ups the `cargo_purse` passes it as an argument and then calls the contract. This is useful when you want to call a payable function attaching some `CSPR`s to the call.

Read more about the `proxy_caller` [here](../backends/03-casper.md#using-proxy_callerwasm).

## Contract
For this tutorial, we will use the `TimeLockWallet` contract from our examples.

```rust title=examples/src/contracts/tlw.rs showLineNumbers
use odra::prelude::*;
use odra::{casper_types::U512, Address, Mapping, Var};

#[odra::module(errors = Error, events = [Deposit, Withdrawal])]
pub struct TimeLockWallet {
    balances: Mapping<Address, U512>,
    lock_expiration_map: Mapping<Address, u64>,
    lock_duration: Var<u64>
}

#[odra::module]
impl TimeLockWallet {
    /// Initializes the contract with the lock duration.
    pub fn init(&mut self, lock_duration: u64) {
        self.lock_duration.set(lock_duration);
    }

    /// Deposits the tokens into the contract.
    #[odra(payable)]
    pub fn deposit(&mut self) {
        // Extract values
        let caller: Address = self.env().caller();
        let amount: U512 = self.env().attached_value();
        let current_block_time: u64 = self.env().get_block_time();

        // Multiple lock check
        if self.balances.get(&caller).is_some() {
            self.env().revert(Error::CannotLockTwice)
        }

        // Update state, emit event
        self.balances.set(&caller, amount);
        self.lock_expiration_map
            .set(&caller, current_block_time + self.lock_duration());
        self.env().emit_event(Deposit {
            address: caller,
            amount
        });
    }

    /// Withdraws the tokens from the contract.
    pub fn withdraw(&mut self, amount: &U512) {
        // code omitted for brevity
    }

    /// Returns the balance of the given account.
    pub fn get_balance(&self, address: &Address) -> U512 {
        // code omitted for brevity
    }

    /// Returns the lock duration.
    pub fn lock_duration(&self) -> u64 {
        // code omitted for brevity
    }
}

/// Errors that may occur during the contract execution.
#[odra::odra_error]
pub enum Error {
    LockIsNotOver = 1,
    CannotLockTwice = 2,
    InsufficientBalance = 3
}

/// Deposit event.
#[odra::event]
pub struct Deposit {
    pub address: Address,
    pub amount: U512
}

/// Withdrawal event.
#[odra::event]
pub struct Withdrawal {
    pub address: Address,
    pub amount: U512
}
```

Full code can be found [here](https://github.com/odradev/odra/blob/release/1.1.0/examples/src/contracts/tlw.rs).

## Client

Before we can interact with the node, we need to set it up. We will use the [`casper-nctl-docker`](https://github.com/make-software/casper-nctl-docker) image.

```bash
docker run --rm -it --name mynctl -d -p 11101:11101 -p 14101:14101 -p 18101:18101 makesoftware/casper-nctl
```

Make sure you have the contract's wasm file and the secret key.

```bash
# Build the contract
cargo odra build -c TimeLockWallet
# Extract secret key
docker exec mynctl /bin/bash -c "cat /home/casper/casper-node/utils/nctl/assets/net-1/users/user-1/secret_key.pem" > your/path/secret_key.pem
```

<Tabs>
<TabItem value="rust" label="Rust">

To interact with the contract, we use the `livenet` backend. It allows to write the code in the same manner as the test code, but it interacts with the live network (a local node in our case).


```toml title=Cargo.toml
[package]
name = "odra-examples"
version = "1.1.0"
edition = "2021"

[dependencies]
odra = { path = "../odra", default-features = false }
... # other dependencies
odra-casper-livenet-env = { version = "1.1.0", optional = true }

... # other sections

[features]
default = []
livenet = ["odra-casper-livenet-env"]

... # other sections

[[bin]]
name = "tlw_on_livenet"
path = "bin/tlw_on_livenet.rs"
required-features = ["livenet"]
test = false

... # other sections
```

```rust title=examples/bin/tlw_on_livenet.rs showLineNumbers
//! Deploys an [odra_examples::contracts::tlw::TimeLockWallet] contract, then deposits and withdraw some CSPRs.
use odra::casper_types::{AsymmetricType, PublicKey, U512};
use odra::host::{Deployer, HostRef};
use odra::Address;
use odra_examples::contracts::tlw::{TimeLockWalletHostRef, TimeLockWalletInitArgs};

const DEPOSIT: u64 = 100;
const WITHDRAWAL: u64 = 99;
const GAS: u64 = 20u64.pow(9);

fn main() {
    let env = odra_casper_livenet_env::env();
    let caller = env.get_account(0);

    env.set_caller(caller);
    env.set_gas(GAS);

    let mut contract = TimeLockWalletHostRef::deploy(
        &env, 
        TimeLockWalletInitArgs { lock_duration: 60 * 60 }
    );
    // Send 100 CSPRs to the contract.
    contract
        .with_tokens(U512::from(DEPOSIT))
        .deposit();
    
    println!("Caller's balance: {:?}", contract.get_balance(&caller));
    // Withdraw 99 CSPRs from the contract.
    contract.withdraw(&U512::from(WITHDRAWAL));
    println!("Remaining balance: {:?}", contract.get_balance(&caller));
}
```

To run the code, execute the following command:

```bash
ODRA_CASPER_LIVENET_SECRET_KEY_PATH=.node-keys/secret_key.pem \
ODRA_CASPER_LIVENET_NODE_ADDRESS=http://localhost:11101 \
ODRA_CASPER_LIVENET_CHAIN_NAME=casper-net-1 \  
cargo run --bin tlw_on_livenet --features=livenet
# Sample output
💁  INFO : Deploying "TimeLockWallet".
💁  INFO : Found wasm under "wasm/TimeLockWallet.wasm".
🙄  WAIT : Waiting 15s for "74f0df4bc65cdf9e05bca70a8b786bd0f528858f26e11f5a9866dfe286551558".
💁  INFO : Deploy "74f0df4bc65cdf9e05bca70a8b786bd0f528858f26e11f5a9866dfe286551558" successfully executed.
💁  INFO : Contract "hash-cce6a97e0db6feea0c4d99f670196c9462e0789fb3cdedd3dfbc6dfcbf66252e" deployed.
💁  INFO : Calling "hash-cce6a97e0db6feea0c4d99f670196c9462e0789fb3cdedd3dfbc6dfcbf66252e" with entrypoint "deposit" through proxy.
🙄  WAIT : Waiting 15s for "bd571ab64c13d2b2fdb8e0e6dd8473b696349dfb5a891b55dbe9f33d017057d3".
💁  INFO : Deploy "bd571ab64c13d2b2fdb8e0e6dd8473b696349dfb5a891b55dbe9f33d017057d3" successfully executed.
Caller's balance: 100
💁  INFO : Calling "hash-cce6a97e0db6feea0c4d99f670196c9462e0789fb3cdedd3dfbc6dfcbf66252e" with entrypoint "withdraw".
🙄  WAIT : Waiting 15s for "57f9aadbd77cbfbbe9b2ba54759d025f94203f9230121289fa37585f8b17020e".
💁  INFO : Deploy "57f9aadbd77cbfbbe9b2ba54759d025f94203f9230121289fa37585f8b17020e" successfully executed.
Remaining balance: 1
```

As observed, the contract was successfully deployed, and the `Caller` deposited tokens. Subsequently, the caller withdrew 99 CSPRs from the contract, leaving the contract's balance at 1 CSPR.
The logs display deploy hashes, the contract's hash, and even indicate if the call was made through the proxy, providing a comprehensive overview of the on-chain activity.
</TabItem>

<TabItem value="ts" label="TypeScript">


Since TypeScript code often requires considerable boilerplate, we offer a streamlined version of the code. We demonstrate how to deploy the contract and prepare a deploy that utilizes the `proxy_caller` to invoke a payable function with attached `CSPR` tokens. The [previous tutorial](./build-deploy-read.md) details how to read the state, which is not the focus of our current discussion.

```typescript title=index.ts showLineNumbers
import {
    CLByteArray,
    CLList,
    CLU8,
    CLValueBuilder,
    CasperClient,
    Contracts,
    Keys,
    RuntimeArgs,
    csprToMotes,
    decodeBase16,
} from "casper-js-sdk";
import fs from "fs";

const LOCAL_NODE_URL = "http://127.0.0.1:11101/rpc";
const SECRET_KEY_PATH = "keys/secret_key.pem"
const PROXY_CALLER_PATH = "wasm/proxy_caller.wasm"
const CONTRACT_PATH = "wasm/TimeLockWallet.wasm";
const CHAIN_NAME = "casper-net-1";
const ENTRY_POINT = "deposit";
const DEPOSIT = 100;
const GAS = 110;
// Once the contract is deployed, the contract package hash
// can be obtained from the global state.
const CONTRACT_PACKAGE_HASH = "...";

const casperClient = new CasperClient(LOCAL_NODE_URL);
const keypair = Keys.Ed25519.loadKeyPairFromPrivateFile(
    SECRET_KEY_PATH
);
const contract = new Contracts.Contract(casperClient);

export async function deploy_contract(): Promise<string> {
    // Required odra_cfg args and the constructor args
    const args = RuntimeArgs.fromMap({
        odra_cfg_package_hash_key_name: CLValueBuilder.string("tlw"),
        odra_cfg_allow_key_override: CLValueBuilder.bool(true),
        odra_cfg_is_upgradable: CLValueBuilder.bool(true),
        lock_duration: CLValueBuilder.u64(60 * 60)
    });
    
    const wasm = new Uint8Array(fs.readFileSync(CONTRACT_PATH));
    const deploy = contract.install(
        wasm,
        args,
        csprToMotes(GAS).toString(),
        keypair.publicKey,
        CHAIN_NAME,
        [keypair],
    );
    return casperClient.putDeploy(deploy);
}
  
export async function deposit(): Promise<string> {
    // Contract package hash is a 32-byte array, 
    // so take the hex string and convert it to a byte array.
    // This is done using the decodeBase16 function from 
    // the casper-js-sdk.
    const contractPackageHashBytes = new CLByteArray(
        decodeBase16(CONTRACT_PACKAGE_HASH)
    );
    // Next, create RuntimeArgs for the deploy 
    // and pass them as bytes to the contract.
    // Note that the args are not a byte array, but a CLList 
    // of CLU8s - a different type of CLValue.
    // Finally, create a Uint8Array from the bytes and 
    // then transform it into a CLList<CLU8>.
    const args_bytes: Uint8Array = RuntimeArgs.fromMap({})
        .toBytes()
        .unwrap();
    const serialized_args = new CLList(
        Array.from(args_bytes)
            .map(value => new CLU8(value))
    );

    const args = RuntimeArgs.fromMap({
        attached_value: CLValueBuilder.u512(DEPOSIT),
        amount: CLValueBuilder.u512(DEPOSIT),
        entry_point: CLValueBuilder.string(ENTRY_POINT),
        contract_package_hash: contractPackageHashBytes,
        args: serialized_args
    });
    // Use proxy_caller to send tokens to the contract.
    const wasm = new Uint8Array(fs.readFileSync(PROXY_CALLER_PATH));
    const deploy = contract.install(
        wasm,
        args,
        csprToMotes(GAS).toString(),
        keypair.publicKey,
        CHAIN_NAME,
        [keypair],
    );
    return casperClient.putDeploy(deploy);
}
  
deploy_contract()
    .then((result) => { console.log(result); });

// One you obatin the contract hash, you can call the deposit function:
// deposit()
//     .then((result) => { console.log(result); });
```

To run the code, execute the following command:

```sh
tsc && node target/index.js 
# Sample output
f40e3ca983034435d829462dd53d801df4e98013009cbf4a6654b3ee467063a1 # the deploy hash
```
</TabItem>
</Tabs>

## Conclusion

In this tutorial, we learned how to use the `proxy_caller` wasm to make a payable function call. We deployed the `TimeLockWallet` contract, deposited tokens using the `proxy_caller` with attached CSPRs, and withdrew them. You got to try it out in both `Rust` and `TypeScript`, so you can choose whichever you prefer. `Rust` code seemed simpler, thanks to the Odra `livenet` backend making chain interactions easier to handle.