# Wasm-Client

To unlock the full potential of Odra contracts, you can leverage the Wasm client to interact with your deployed contracts
in a TypeScript environment. The Odra Wasm client library provides a seamless way to connect to the Casper blockchain.

## Project Structure

```plaintext
counter
|── cli
│    ├── bin
│    |   ├── build_contract.rs
│    |   └── build_schema.rs
│    ├── src
│    │   └── lib.rs
│    |── build.rs
│    └── Cargo.toml
|── counter
│    ├── src
│    │   ├── access
│    │   │   ├── access_control.rs
│    │   │   ├── events.rs
│    │   │   └── errors.rs
│    │   └── lib.rs
│    |── build.rs
│    |── Cargo.toml
│    └── Odra.toml
|── counter_client
│    └── pkg-web
│        ├── counter_wasm_client.wasm
│        ├── counter_wasm_client.wasm.d.ts
│        ├── counter_wasm_client.d.ts
│        ├── counter_wasm_client.js
│        └── package.json
|── resources
│   └── casper_contract_schemas
│       └── counter_schema.json
│── Cargo.toml
│── Odra.toml
└── rust-toolchain
    
```

## Contract

```rust
use odra::prelude::*;

#[odra::module(
    events = [CounterIncremented, CounterDecremented, CounterSet],
    errors = Error
)]
pub struct Counter {
    value: Var<u32>,
}

#[odra::module]
impl Counter {
    pub fn init(&mut self, initial_value: u32) {
        self.value.set(initial_value);
    }

    pub fn increment(&mut self) {
        let current_value = self.value.get_or_default();
        if current_value < u32::MAX {
            let new_value = current_value + 1;
            self.value.set(new_value);
            self.env().emit_event(CounterIncremented { new_value });
        } else {
            self.env().revert(Error::Overflow);
        }
    }

    pub fn decrement(&mut self) {
        let current_value = self.value.get_or_default();
        if current_value > 0 {
            let new_value = current_value - 1;
            self.value.set(new_value);
            self.env().emit_event(CounterDecremented { new_value });
        } else {
            self.env().revert(Error::Underflow);
        }
    }

    pub fn set(&mut self, new_value: u32) {
        self.value.set(new_value);
        self.env().emit_event(CounterSet { new_value });
    }

    pub fn read(&self) -> u32 {
        self.value.get_or_default()
    }
}

#[odra::odra_error]
pub enum Error {
    Overflow = 1,
    Underflow = 2,
}

#[odra::event]
pub struct CounterIncremented {
    new_value: u32,
}

#[odra::event]
pub struct CounterDecremented {
    new_value: u32,
}

#[odra::event]
pub struct CounterSet {
    new_value: u32,
}
```

## Setup

### Prerequisites

`cargo odra generate-client` has two requirements that a project created with a plain `cargo odra new`
does not meet out of the box:

1. **`wasm-pack` must be installed** (see [wasm-pack](https://github.com/drager/wasm-pack)); the command
   fails with `wasm-pack is not installed` otherwise.
2. **The project must be a Cargo workspace** with `odra` declared under `[workspace.dependencies]`, as in
   the [Project Structure](#project-structure) layout above. Against a single-crate project the command
   stops with `Project is not a workspace`, and then with `Odra is not a dependency of this project`.
   Either start from `cargo odra new -t workspace`, or convert your project by moving the contract crate
   into a member directory and hoisting the dependencies:

   ```toml title="Cargo.toml (workspace root)"
   [workspace]
   members = ["counter"]

   [workspace.dependencies]
   odra = { version = "2.11.0", features = [], default-features = false }
   ```

   ```toml title="counter/Cargo.toml"
   [dependencies]
   odra = { workspace = true }
   ```

### Generating the client

To generate the Wasm client for your Odra project, execute the following command in your terminal:

```sh
cargo odra generate-client
```

This command generates the Wasm client for the `Counter` contract, creating the necessary TypeScript files in the `counter_client/pkg-web` directory.

Once the client is generated, you can use it in your TypeScript project as follows:

```typescript
import init, {
    AccountInfo,
    Contracts,
    CounterWasmClient,
    CsprClickCallbacks,
    OdraWasmClient,
    TransactionStatus,
    TransactionResult,
} from "counter-wasm-client";

// Testnet proxies a browser may call, see "Reading contract state" below.
const RPC_URL = "https://testnet-rpc.odra.dev";
const SPECULATIVE_RPC_URL = "https://testnet-speculative-rpc.odra.dev";
const CHAIN_NAME = "casper-test";

// ---------- Types ----------
let counter: CounterWasmClient;
let client: OdraWasmClient;
let contracts: Contracts;

async function onConnect(accountInfo: AccountInfo) {
  // Handle successful connection
}

function onTransactionStatusUpdate(status: TransactionStatus, data: TransactionResult) {
  if (status === TransactionStatus.SENT) {
    // Transaction has been sent
  } else if (status === TransactionStatus.PROCESSED) {
    if (data.error) {
      if (data.errorCode) {
        if (data.errorCode === CounterErrors.Overflow) {
          // Specific error handling for Overflow
        } else if (data.errorCode === CounterErrors.Underflow) {
          // Specific error handling for Underflow
        } else {
          // Handle other specific errors
        }
      } else {
        // Handle generic error without specific code
      }
    } else {
      // Transaction succeeded
    }
  } else if (status === TransactionStatus.ERROR) {
    // Handle unknown error
  }
}

async function run() {
    // 1. Initialize WASM
    await init();

    // 2. Initialize the clients
    contracts = await Contracts.fromPath('./contracts.json');
    client = new OdraWasmClient(RPC_URL, SPECULATIVE_RPC_URL, CHAIN_NAME);
    counter = new CounterWasmClient(client, contracts.get("Counter").address);

    // 3. Set your custom callback
    CsprClickCallbacks.onSignedIn(async (accountInfo: AccountInfo) => {
        console.log('Signed in handler:');
        await onConnect(accountInfo);
    });
    CsprClickCallbacks.onSwitchedAccount(async (accountInfo: AccountInfo) => {
        console.log('Switched account handler:', accountInfo);
        await onConnect(accountInfo);
    });
    CsprClickCallbacks.onSignedOut(() => {
        console.log('Signed out handler');
        // Reset state
    });
    CsprClickCallbacks.onTransactionStatusUpdate((status: TransactionStatus, data: TransactionResult) => {
        console.log('Transaction status update handler:', status, data);
        onTransactionStatusUpdate(status, data);
    });
}

// 4. Start the initialization process
run().catch(err => console.error("Failed to initialize:", err));
```

There a few key steps to note in the above code:
1. **WASM Initialization**: The `init()` function is called to initialize the WASM module.
2. **Client Setup**: An instance of `OdraWasmClient` is created to connect to the Casper blockchain, and a `CounterWasmClient` is instantiated to interact with the `Counter` contract.
3. **Cspr.Click Callbacks**: Custom callbacks are set up to handle events such as signing in, switching accounts, signing out, and transaction status updates.

We will take a closer look at these components in the sections below.

## Odra Wasm Client

`OdraWasmClient` is a key component of the Odra Wasm client library that facilitates interaction with contracts deployed on the Casper blockchain
and seamslessly integrates with CsprClick.

It abstracts away the complexities of interacting with the blockchain, allowing you to focus on building your application logic. You don't need to worry 
about low-level details such as constructing transactions or handling signatures; the `OdraWasmClient` takes care of these aspects for you.

Additionally, it provides built-in support for basic operations such as signing transactions, and querying account information, 
connecting/disconnecting wallets making it easier to work with Odra contracts in a TypeScript environment.

## Reading contract state

A call of a non-mutating entry point (`counter.read()`) sends no transaction. The client simulates the
call on a node with the `speculative_exec` RPC and returns the value the entry point returned. Nothing is
paid and the wallet is not involved, so a page can show contract state before the user connects. Three
things have to be in place.

### Nodes a browser can call

The client needs two JSON-RPC addresses: a node, and a node that serves `speculative_exec`. Public nodes
do not allow cross-origin requests and do not serve `speculative_exec`, so a page cannot use them
directly. The Odra team runs proxies for both networks:

| Network | Chain name | Node | Speculative node |
| --- | --- | --- | --- |
| Testnet | `casper-test` | `https://testnet-rpc.odra.dev` | `https://testnet-speculative-rpc.odra.dev` |
| Mainnet | `casper` | `https://mainnet-rpc.odra.dev` | `https://mainnet-speculative-rpc.odra.dev` |

Pass the address without the `/rpc` suffix, the client appends it. The NCTL docker image does not serve
`speculative_exec`, so reads do not work against a local node.

### The reader key

A simulated call is a signed transaction like any other, and has to be signed by an account that exists
on the network. The key of that account is compiled into the client: set `WASM_CLIENT_SK` to the content
of a secret key file when generating it.

```sh
WASM_CLIENT_SK="$(cat reader_secret_key.pem)" cargo odra generate-client
```

:::warning
The key is part of the `.wasm` file every visitor downloads, so it is public. Create a key for this
purpose only, never use the key that deploys your contracts, and keep no more CSPR on it than the first
transfer that created the account (2.5 CSPR is the smallest transfer).
:::

Without `WASM_CLIENT_SK` the client builds, and every read fails with `WASM_CLIENT_SK was empty at build
time`. If the account has never received CSPR on the network, a read fails with `no such addressable
entity`. With Odra 2.10 the PEM has to be put on one line (`"$(tr -d '\n' < reader_secret_key.pem)"`),
or reads fail with `Invalid secret key`.

### The addresses of the contracts

`Contracts.fromPath` loads a JSON file with the same content as the `resources/<chain>-contracts.toml` the
[Odra CLI](../tutorials/odra-cli.md) writes when it deploys:

```json title="contracts.json"
{
  "last_updated": "2026-11-16T13:02:05Z",
  "contracts": [
    { "name": "Counter", "package_hash": "hash-85261f49f18ff74adb4bf027516770e3ff126498d85d4dc4626898dbd0a567f6" }
  ]
}
```

### What a read returns

`U256`, `U512` and `Address` are objects of the client (`value.toString()`, `address.value`), a `u64` is a
`bigint`, an `Option` is the value or `undefined`. An entry point that reverts rejects the promise with
`Speculative execution failed for '<entry point>': ...` and the error code of the contract. A gas limit
has to be set before a read as well (`setGas`), although nothing is charged.

## Interacting with the Contract

An instance of `OdraWasmClient` is used to create a contract-specific client, in this case, `CounterWasmClient`, 
which provides methods to interact with the `Counter` contract.

```typescript
import {
    setGas,
    DEFAULT_PAYMENT_AMOUNT,
} from "counter-wasm-client";

async function increment() {
  try {
    setGas(DEFAULT_PAYMENT_AMOUNT());
    await counter.increment();
  } catch (e: any) {
    // Handle specific contract errors
  }
}

async function decrement() {
  try {
    setGas(DEFAULT_PAYMENT_AMOUNT());
    await counter.decrement();
  } catch (e: any) {
    // Handle specific contract errors
  }
}

async function set(value: number) {
  try {
    setGas(DEFAULT_PAYMENT_AMOUNT());
    await counter.set(value);
  } catch (e: any) {
    // Handle specific contract errors
  }
}

async function read_value() {
  try {
    const value = await counter.read();
    // Use the retrieved value
  } catch (e: any) {
    // Handle specific contract errors
  }
}
```

## Conclusion

By utilizing the Odra Wasm client, you can interact with your Odra contracts in a TypeScript environment with
minimal effort. The `OdraWasmClient` simplifies the process of connecting to the Casper blockchain. 
Don't bother with low-level details; focus on building your dapp logic and let the client handle the complexities 
of blockchain interaction.