# Storage Layout

Odra's innovative modular design necessitates a unique storage layout. This
article explains step-by-step Odra's storage layout.

## Casper VM Perspective
The Casper Execution Engine (VM) enables the storage of data in named keys or
dictionaries. However, a smart contract has a limited number of named keys,
making it unsuitable for storing substantial data volumes. Odra resolves this
issue by storing all user-generated data in a dictionary called `state`. This
dictionary operates as a key-value store, where keys are strings with a maximum
length of 64 characters, and values are arbitrary byte arrays.

Here is an example of what the interface for reading and writing data could look
like:

```rust
pub trait CasperStorage {
    fn read(key: &str) -> Option<Vec<u8>>;
    fn write(key: &str, value: Vec<u8>);
}
```

## Odra Perspective
Odra was conceived with modularity and code reusability in mind. Additionally,
we aimed to streamline storage definition through the struct object. Consider
this straightforward storage definition:

```rust
#[odra::module]
pub struct Token {
    name: Var<String>,
    balances: Mapping<Address, U256>
}
```

The `Token` structure contains two fields: `name` of type `String` and
`balances`, which functions as a key-value store with `Address` as keys and
`U256` as values.

The `Token` module can be reused in another module, as demonstrated in a more
complex example:

```rust
#[odra::module]
pub struct Loans {
    lenders: SubModule<Token>,
    borrowers: SubModule<Token>,
}
```

The `Loans` module has two fields: `lenders` and `borrowers`, both of which have
the same storage layout as defined by the `Token` module. Odra guarantees that
`lenders` and `borrowers` are stored under distinct keys within the storage
dictionary.

Both `Token` and `Loans` serve as examples to show how Odra's storage layout
operates.

## Key generation.

Every element of a module (`struct`) with N elements is associated with an index
ranging from 1 to N, represented as a u8. If an element of a module is another
module (`SubModule<...>`), the associated index serves as a prefix for the
indexes of the inner module.

:::note
The compact, nibble-packed key format shown below is used only while every index
along the path is 15 or lower - that is, up to 15 fields per module. Beyond that
Odra switches to a longer key encoding. Nesting is also capped: a path deeper than
8 levels reverts with `ExecutionError::PathIndexOutOfBounds`.
:::

While this may initially appear complex, it is easily understood through an
example. In the example, indexes are presented as bytes, reflecting the actual
implementation.

```
Loans {
    lenders: Token {   // prefix: 0x0001
        name: 1,       //    key: 0x0001_0001
        balances: 2    //    key: 0x0001_0010
    },
    borrowers: Token { // prefix: 0x0010
        name: 1,       //    key: 0x0010_0001
        balances: 2    //    key: 0x0010_0010
    }
}
```

Additionally, it's worth mentioning how `Mapping`'s keys are used in the
`storage`. They are simply concatenated with the index of the module, as
demonstrated in the example.

For instance, triggering `borrowers.balances.get(0x1234abcd)` would result in a
key:
```
0x0001_0001_1234_abcd
```

Finally, the key must be hashed to fit within the 64-character limit and then
encoded in hexadecimal format.

## Value serialization
Before being stored in the storage, each value is serialized into bytes using
the `CLType` serialization method and subsequently encapsulated with Casper's
`Bytes` types.

## Reading the storage from the outside
You do not have to compute the keys by hand. Every module gets a generated
`odra::schema::SchemaStorageLayout` implementation that describes the layout
shown above as data: the index of each field, what is stored under it and the
types involved. `odra::schema::resolve_storage` walks that description for a
dotted field path (e.g. `borrowers.balances`) and the mapping keys, and returns
the storage location together with the type of the value:

```rust
use odra::casper_types::bytesrepr::ToBytes;
use odra::schema::{resolve_storage, SchemaStorageLayout, StorageLocation};

let layout = Loans::storage_kind();
let key = account.to_bytes().unwrap();
let query = resolve_storage(&layout, "borrowers.balances", &[key]).unwrap();

if let StorageLocation::State { key } = &query.location {
    // `key` is the `state` dictionary item key - read it with the node RPC,
    // or directly through the host environment:
    let bytes = env.get_storage_value(&contract_address, key.as_bytes());
}
```

`HostEnv` exposes `get_storage_value`, `get_named_value` and
`get_dictionary_value` for the three kinds of locations, and they work on
every backend - OdraVM, CasperVM and livenet.

The [Odra CLI](../tutorials/odra-cli#storage-command) wraps all of this in the
`storage` command, which prints the layout of a contract and reads any field
by its path.

Modules that store data outside of the layout described in this article, for
example under named keys, declare their layout explicitly with the `layout`
argument of the module attribute:

```rust
#[odra::module(layout = odra::schema::StorageKind::named_key::<u8>("decimals"))]
pub struct Decimals;
```

The named-key storage macros (`single_value_storage!`, `key_value_storage!`,
`base64_encoded_key_value_storage!` and `compound_key_value_storage!`) do this
for you.
