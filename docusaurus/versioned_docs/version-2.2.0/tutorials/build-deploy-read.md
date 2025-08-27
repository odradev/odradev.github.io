---
sidebar_position: 7
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Build, Deploy and Read the State of a Contract

In this guide, we will show the full path from creating a contract, deploying it and reading the state.

We will use a contract with a complex storage layout and show how to deploy it and then read the state of the contract in Rust and TypeScript.

Before you start, make sure you completed the following steps:
- Read the [Getting Started] guide
- Get familiar with [NCTL tutorial]
- Install [NCTL docker] image
- Install [casper-client]

### Contract

Let's write a contract with complex storage layout.

The contract stores a plain numeric value, a custom nested type and a submodule with another submodule with stores a `Mapping`.

We will expose two methods:
1. The constructor `init` which sets the metadata and the version of the contract.
2. The method `set_data` which sets the value of the numeric field and the values of the mapping.

```rust title=custom_item.rs showLineNumbers
use odra::{casper_types::U256, prelude::*};

// A custom type with a vector of another custom type
#[odra::odra_type]
pub struct Metadata {
    name: String,
    description: String,
    prices: Vec<Price>,
}

#[odra::odra_type]
pub struct Price {
    value: U256,
}

// The main contract with a version, metadata and a submodule
#[odra::module]
pub struct CustomItem {
    version: Var<u32>,
    meta: Var<Metadata>,
    data: SubModule<Data>
}

#[odra::module]
impl CustomItem {
    pub fn init(&mut self, name: String, description: String, price_1: U256, price_2: U256) {
        let meta = Metadata {
            name,
            description,
            prices: vec![
                Price { value: price_1 },
                Price { value: price_2 }
            ]
        };
        self.meta.set(meta);
        self.version.set(self.version.get_or_default() + 1);
    }

    pub fn set_data(&mut self, value: u32, name: String, name2: String) {
        self.data.value.set(value);
        self.data.inner.named_values.set(&name, 10);
        self.data.inner.named_values.set(&name2, 20);
    }
}

// A submodule with a numeric value and another submodule
#[odra::module]
struct Data {
    value: Var<u32>,
    inner: SubModule<InnerData>,
}

// A submodule with a mapping
#[odra::module]
struct InnerData {
    named_values: Mapping<String, u32>,
}

```

### Deploying the contract


First, we need to setup the chain. We will use the NCTL docker image to run a local network.

```
docker run --rm -it --name mynctl -d -p 11101:11101 -p 14101:14101 -p 18101:18101 makesoftware/casper-nctl
```

Next, we need to compile the contract to a Wasm file.

```sh
cargo odra build -c custom_item 
```

Then, we can deploy the contract using the `casper-client` tool.

```sh
casper-client put-transaction session \
  --node-address http://localhost:11101 \
  --chain-name casper-net-1 \
  --secret-key path/to/your/secret_key.pem \ 
  --wasm-path ./wasm/Erc20.wasm \
  --payment-amount 450000000000 \
  --gas-price-tolerance 1 \
  --standard-payment true \
  --session-arg "odra_cfg_package_hash_key_name:string:'test_contract_package_hash'" \
  --session-arg "odra_cfg_allow_key_override:bool:'true'" \
  --session-arg "odra_cfg_is_upgradable:bool:'true'" \
  --session-arg "name:string='My Name'" \
  --session-arg "description:string='My Description'" \ 
  --session-arg "price_1:u256='101'" \
  --session-arg "price_2:u256='202'"
```

Finally, we can call the `set_data` method to set the values of the contract.

```sh
casper-client put-transaction package \
    --node-address http://localhost:11101 \
    --chain-name casper-net-1 \
    --secret-key path/to/your/secret_key.pem \
    --gas-price-tolerance 1 \
    --contract-package-hash "hash-..." \
    --payment-amount 2500000000 \
    --standard-payment "true" \
    --session-entry-point "set_data" \
    --session-arg "value:u32:'666'" \
    --session-arg "name:string='alice'" \ 
    --session-arg "name2:string='bob'"
```

### Storage Layout

To read the state of the contract, we need to understand the storage layout.

The first step is to calculate the index of the keys. 

```
Storage Layout

CustomItem:                 prefix: 0x0..._0000_0000_0000  0
  version: u32,                     0x0..._0000_0000_0001  1
  meta: Metadata,                   0x0..._0000_0000_0010  2
  data: Data:               prefix: 0x0..._0000_0000_0011  3
    value: u32,                     0x0..._0000_0011_0001  (3 << 4) + 1
    inner: InnerData:       prefix: 0x0..._0000_0011_0010  (3 << 4) + 2
      named_values: Mapping         0x0..._0011_0010_0001  ((3 << 4) + 2) << 4 + 1
```

The actual key is obtained as follows:
1. Convert the index to a big-endian byte array.
2. Concatenate the index with the mapping data.
3. Hash the concatenated bytes using blake2b.
4. Return the hex representation of the hash (the stored key must be utf-8 encoded).

In more detail, the storage layout is described in the [Storage Layout article](../advanced/04-storage-layout.md).

### Reading the state

<Tabs>
<TabItem value="rust" label="Rust">

```rust title=main.rs showLineNumbers
use casper_client::{rpcs::DictionaryItemIdentifier, types::StoredValue, Verbosity};
use casper_types::{
    bytesrepr::{FromBytes, ToBytes},
    U256,
};

// replace with your contract hash
const CONTRACT_HASH: &str = "hash-...";
const NODE_ADDRESS: &str = "http://localhost:11101/rpc";
const RPC_ID: &str = "casper-net-1";
const DICTIONARY_NAME: &str = "state";

#[derive(Debug, PartialEq, Eq, Hash)]
pub struct Metadata {
    name: String,
    description: String,
    prices: Vec<Price>,
}

#[derive(Debug, PartialEq, Eq, Hash)]
pub struct Price {
    value: U256,
}

async fn read_state_key(key: String) -> Vec<u8> {
    let state_root_hash = casper_client::get_state_root_hash(
        RPC_ID.to_string().into(),
        NODE_ADDRESS,
        Verbosity::Low,
        None,
    )
    .await
    .unwrap()
    .result
    .state_root_hash
    .unwrap();

    // Read the value from the `state` dictionary.
    let result = casper_client::get_dictionary_item(
        RPC_ID.to_string().into(),
        NODE_ADDRESS,
        Verbosity::Low,
        state_root_hash,
        DictionaryItemIdentifier::ContractNamedKey {
            key: CONTRACT_HASH.to_string(),
            dictionary_name: DICTIONARY_NAME.to_string(),
            dictionary_item_key: key,
        },
    )
    .await
    .unwrap()
    .result
    .stored_value;

    // We expect the value to be a CLValue
    if let StoredValue::CLValue(cl_value) = result {
        // Ignore the first 4 bytes, which are the length of the CLType.
        cl_value.inner_bytes()[4..].to_vec()
    } else {
        vec![]
    }
}

async fn metadata() -> Metadata {
    // The key for the metadata is 2, and it has no mapping data
    let key = key(2, &[]);
    let bytes = read_state_key(key).await;

    // Read the name and store the remaining bytes
    let (name, bytes) = String::from_bytes(&bytes).unwrap();
    // Read the description and store the remaining bytes
    let (description, bytes) = String::from_bytes(&bytes).unwrap();
    // A vector is stored as a u32 size followed by the elements
    // Read the size of the vector and store the remaining bytes
    let (size, mut bytes) = u32::from_bytes(&bytes).unwrap();

    let mut prices = vec![];
    // As we know the size of the vector, we can loop over it
    for _ in 0..size {
        // Read the value and store the remaining bytes
        let (value, rem) = U256::from_bytes(&bytes).unwrap();
        bytes = rem;
        prices.push(Price { value });
    }
    // Anytime you finish parsing a value, you should check if there are any remaining bytes
    // if there are, it means you have a bug in your parsing logic.
    // For simplicity, we will ignore the remaining bytes here.
    Metadata {
        name,
        description,
        prices
    }
}

async fn value() -> u32 {
    // The key for the value is (3 << 4) + 1, and it has no mapping data
    let key = key((3 << 4) + 1, &[]);
    let bytes = read_state_key(key).await;

    // Read the value and ignore the remaining bytes for simplicity
    u32::from_bytes(&bytes).unwrap().0
}

async fn named_value(name: &str) -> u32 {
    // The key for the named value is (((3 << 4) + 2) << 4) + 1, and the mapping data is the name as bytes
    let mapping_data = name.to_bytes().unwrap();
    let key = key((((3 << 4) + 2) << 4) + 1, &mapping_data);
    let bytes = read_state_key(key).await;

    // Read the value and ignore the remaining bytes for simplicity
    u32::from_bytes(&bytes).unwrap().0
}

fn main() {
    let runtime = tokio::runtime::Runtime::new().unwrap();
    dbg!(runtime.block_on(metadata()));
    dbg!(runtime.block_on(value()));
    dbg!(runtime.block_on(named_value("alice")));
    dbg!(runtime.block_on(named_value("bob")));
}

// The key is a combination of the index and the mapping data
// The algorithm is as follows:
// 1. Convert the index to a big-endian byte array
// 2. Concatenate the index with the mapping data
// 3. Hash the concatenated bytes using blake2b
// 4. Return the hex representation of the hash (the stored key must be utf-8 encoded)
fn key(idx: u32, mapping_data: &[u8]) -> String {
    let mut key = Vec::new();
    key.extend_from_slice(idx.to_be_bytes().as_ref());
    key.extend_from_slice(mapping_data);
    let hashed_key = blake2b(&key);

    hex::encode(&hashed_key)
}

fn blake2b(bytes: &[u8]) -> [u8; 32] {
    let mut result = [0u8; 32];
    let mut hasher = <blake2::Blake2bVar as blake2::digest::VariableOutput>::new(32)
        .expect("should create hasher");
    let _ = std::io::Write::write(&mut hasher, bytes);
    blake2::digest::VariableOutput::finalize_variable(hasher, &mut result)
        .expect("should copy hash to the result array");
    result
}

```

```sh
cargo run
[src/main.rs:116:5] runtime.block_on(metadata()) = Metadata {
    name: "My Contract",
    description: "My Description",
    prices: [
        Price {
            value: 123,
        },
        Price {
            value: 321,
        },
    ],
}
[src/main.rs:117:5] runtime.block_on(value()) = 666
[src/main.rs:118:5] runtime.block_on(named_value("alice")) = 20
[src/main.rs:119:5] runtime.block_on(named_value("bob")) = 10
```

</TabItem>

<TabItem value="ts" label="TypeScript">

```typescript title=index.ts showLineNumbers

import { blake2bHex } from "blakejs";
import {
  CLList,
  CLListBytesParser,
  CLStringBytesParser,
  CLU256BytesParser,
  CLU32BytesParser,
  CLU8,
  CLValueBuilder,
  CasperClient,
  CasperServiceByJsonRPC,
  Contracts,
  ToBytes,
} from "casper-js-sdk";

const LOCAL_NODE_URL = "http://127.0.0.1:11101/rpc";
// replace with your contract hash
const CONTRACT_HASH = "hash-...";
const STATE_DICTIONARY_NAME = "state";
const U32_SIZE = 4;

class Price {
  value: bigint;

  constructor(value: bigint) {
    this.value = value;
  }
}

class Metadata {
  name: string;
  description: string;
  prices: Price[];

  constructor(name: string, description: string, prices: Price[]) {
    this.name = name;
    this.description = description;
    this.prices = prices;
  }
}

export class Contract {
  client: CasperClient;
  service: CasperServiceByJsonRPC;
  contract: Contracts.Contract;

  private constructor() {
    this.client = new CasperClient(LOCAL_NODE_URL);
    this.service = new CasperServiceByJsonRPC(LOCAL_NODE_URL);
    this.contract = new Contracts.Contract(this.client);
    this.contract.setContractHash(CONTRACT_HASH);
  }

  static async load() {
    return new Contract();
  }

  async read_state(key: string) {
    const response = await this.contract.queryContractDictionary(STATE_DICTIONARY_NAME, key);
    let data: CLList<CLU8 & ToBytes> = CLValueBuilder.list(response.value());
    let bytes = new CLListBytesParser().toBytes(data).unwrap();
    // Ignore the first 4 bytes, which are the length of the CLType
    return bytes.slice(4);
  }

  async metadata() {
    // The key for the metadata is 2, and it has no mapping data
    let bytes: Uint8Array = await this.read_state(key(2));

    // Read the name and store the remaining bytes
    let name = new CLStringBytesParser().fromBytesWithRemainder(bytes);
    bytes = name.remainder as Uint8Array;

    // Read the description and store the remaining bytes
    let description = new CLStringBytesParser().fromBytesWithRemainder(bytes);
    bytes = description.remainder as Uint8Array;

    let prices: Price[] = [];
    // A vector is stored as a u32 size followed by the elements
    // Read the size of the vector and store the remaining bytes
    let size = new CLU32BytesParser().fromBytesWithRemainder(bytes);
    bytes = size.remainder as Uint8Array;

    // As we know the size of the vector, we can loop over it
    for (let i = 0; i < size.result.unwrap().data.toNumber(); i++) {
      let price = new CLU256BytesParser().fromBytesWithRemainder(bytes);
      bytes = price.remainder as Uint8Array;
      prices.push(new Price(price.result.unwrap().data.toBigInt()));
    }

    // Anytime you finish parsing a value, you should check if there are any remaining bytes
    // if there are, it means you have a bug in your parsing logic.
    // For simplicity, we will ignore the remaining bytes here.
    return new Metadata(
      name.result.unwrap().data,
      description.result.unwrap().data,
      prices
    );
  }
  
  async value() {
    // The key for the value is (3 << 4) + 1, and it has no mapping data
    const bytes = await this.read_state(key((3 << 4) + 1));

    // Read the value and ignore the remaining bytes for simplicity
    let value = new CLU32BytesParser().fromBytesWithRemainder(bytes);
    return value.result.unwrap().data.toBigInt();
  }

  async named_value(name: string) {
    // The key for the named value is (((3 << 4) + 2) << 4) + 1, and the mapping data is the name as bytes
    let mapping_data = new CLStringBytesParser()
      .toBytes(CLValueBuilder.string(name))
      .unwrap();
    let bytes: Uint8Array = await this.read_state(
      key((((3 << 4) + 2) << 4) + 1, mapping_data)
    );

    // Read the value and ignore the remaining bytes for simplicity
    let value = new CLU32BytesParser().fromBytesWithRemainder(bytes);
    return value.result.unwrap().data.toBigInt();
  }
}

// The key is a combination of the index and the mapping data
// The algorithm is as follows:
// 1. Convert the index to a big-endian byte array
// 2. Concatenate the index with the mapping data
// 3. Hash the concatenated bytes using blake2b
// 4. Return the hex representation of the hash (the stored key must be utf-8 encoded)
function key(idx: number, mapping_data: Uint8Array = new Uint8Array([])) {
  let key = new Uint8Array(U32_SIZE + mapping_data.length);
  new DataView(key.buffer).setUint32(0, idx, false); // false for big-endian
  key.set(mapping_data, U32_SIZE);

  return blake2bHex(key, undefined, 32);
}

const contract = Contract.load();
contract.then(async (c) => {
  console.log(await c.value());
  console.log(await c.metadata());
  console.log(await c.named_value("alice"));
  console.log(await c.named_value("bob"));
});
```

```sh
tsc && node target/index.js 
Metadata {
  name: 'My Contract',
  description: 'My Description',
  prices: [ Price { value: 123n }, Price { value: 321n } ]
}
666n
20n
10n
```

</TabItem>
</Tabs>

[Getting Started]: ../category/getting-started
[NCTL tutorial]: https://docs.casper.network/developers/dapps/setup-nctl/
[NCTL docker]: https://github.com/make-software/casper-nctl-docker
[casper-client]: https://github.com/casper-ecosystem/casper-client-rs
