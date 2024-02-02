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
    name: Variable<String>,
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
    lenders: ModuleWrapper<Token>,
    borrowers: ModuleWrapper<Token>,
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
ranging from 0 to N-1, represented as a u8 with a maximum of 256 elements. If an
element of a module is another module (`ModuleWrapper<...>`), the associated index
serves as a prefix for the indexes of the inner module.

While this may initially appear complex, it is easily understood through an
example. In the example, indexes are presented as bytes, reflecting the actual
implementation.

```
Loans {
    lenders: Token {   // prefix: 0x0000
        name: 0,       //    key: 0x0000_0000
        balances: 1    //    key: 0x0000_0001
    },
    borrowers: Token { // prefix: 0x0001
        name: 0,       //    key: 0x0001_0000
        balances: 1    //    key: 0x0001_0001
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
