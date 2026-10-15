---
sidebar_position: 14
---

# Reading Contract Storage

Every value an Odra contract keeps is in its storage on the chain, and the node will hand it out
to anyone who asks for the right key. Reading it that way costs no gas, needs no entry point and
works from any JavaScript program. The catch is the key: Odra hashes the field indices and the
mapping keys into dictionary item keys, as the [Storage Layout] article explains, and the stored
bytes have to be decoded with the right type.

Since Odra 2.10.0 both parts are automated. A **storage layout file** describes where each field
of a contract lives and how its values are typed, and the **storage reader**, a small wasm
library, turns a field path into the dictionary key or named key to fetch and decodes what the
node returns. The reader never talks to the node itself: you fetch with `casper-js-sdk`, or with
any other RPC client, and hand it the result.

In this tutorial we read the storage of [Casper Delta], a perpetual swap deployed on Casper
mainnet, from a Node script. If you want to see how the keys are computed by hand first, the
[Build, Deploy and Read the State of a Contract] tutorial does that for a small contract.

## Casper Delta

Casper Delta is three Odra contracts: the `Market`, which holds the funds and the price, and two
`PositionToken` CEP-18 tokens, `CD_LONG` and `CD_SHORT`, that represent the long and the short
side. The `Market` module looks like this:

```rust title="market.rs"
#[odra::module]
pub struct Market {
    access_control: SubModule<AccessControl>,
    pauseable: SubModule<Pauseable>,
    metadata: SubModule<Cep96>,
    state: Var<MarketState>,
    price_feed: Var<Address>,
    price_feed_id: Var<String>,
    fee: Var<U256>,
    long_token: Var<Address>,
    short_token: Var<Address>,
    wcspr_token: Var<Address>,
    fee_collector: Var<Address>,
}
```

and the `PositionToken` module like this:

```rust title="position_token.rs"
#[odra::module]
pub struct PositionToken {
    token_type: Var<LongOrShort>,
    token: SubModule<Cep18>,
    access_control: SubModule<AccessControl>,
    metadata: SubModule<Cep96>,
    market: Var<Address>,
    wcspr: Var<Address>,
    peer_transfers_enabled: Var<bool>,
}
```

Between them they use every kind of storage Odra has: plain `Var`s, a `Var` holding a custom
struct (`MarketState`) and one holding an enum (`LongOrShort`), `Mapping`s with tuple keys in
`AccessControl`, and the Casper named keys and dictionaries of the CEP-18 standard in `Cep18`.

The contracts are deployed on mainnet under these package hashes:

| Contract | Package hash |
|---|---|
| `Market` | `hash-4b15cdbc606589ebfdcdb3f8f81e2a2a0d44298e3d1faf0743d2be2d90d8cb6b` |
| `CD_LONG` | `hash-30f66fc8f60ee99e7a8a05c3a308ee623c229247c0cc7ac8dc76621157397a93` |
| `CD_SHORT` | `hash-d65a7e04b687bd873af5819de67d563ff347560dfef16ad2c1065cac3e115b96` |

## The storage layout file

The layout file is generated from the contract code. In the project of the contract, run:

```sh
cargo odra schema
```

Next to the contract schemas it writes one layout file per contract in `Odra.toml`, as
`resources/storage/<Contract>.json`. The file is JSON with four top-level fields:

- `version` - the format version, `1`. The reader rejects a file with a version it does not know.
- `contract` - the name the contract is registered under, and `ident` - the name of the module.
- `layout` - the tree of fields. Every field has a `name`, its `index` in the module (the same
  index [Storage Layout] hashes into the key) and a `kind`:
  - `value` - a `Var`, with the type of the value in `ty`;
  - `mapping` - a `Mapping`, with the type of the `key` and the `value` stored under it;
  - `list` and `sequence` - a `List` and a `Sequence`;
  - `named_key` - a value stored under a Casper named key, with its `key_name`;
  - `dictionary` - a Casper dictionary, with its `dictionary_name`, the `key` type, the `value`
    type and the `key_encoding` that turns a key into the dictionary item key.
  - `module` - a `SubModule`, with its own `fields`;
- `types` - the custom structs and enums the contract declares, so that a value like
  `MarketState` can be decoded to its fields.

This is the layout of the `Market`. The `AccessControl` roles are a `Mapping` keyed by a tuple of
the role (32 bytes) and the address, `state` is a `Var<MarketState>`, and `MarketState` itself
is described in `types` together with the events of the contract.

<details>
<summary><code>resources/storage/Market.json</code></summary>

```json
{
  "version": 1,
  "contract": "Market",
  "ident": "Market",
  "layout": {
    "kind": "module",
    "fields": [
      {
        "name": "access_control",
        "index": 1,
        "kind": "module",
        "fields": [
          {
            "name": "roles",
            "index": 1,
            "kind": "mapping",
            "key": {
              "Tuple2": [
                {
                  "ByteArray": 32
                },
                "Key"
              ]
            },
            "value": {
              "kind": "value",
              "ty": "Bool"
            }
          },
          {
            "name": "role_admin",
            "index": 2,
            "kind": "mapping",
            "key": {
              "ByteArray": 32
            },
            "value": {
              "kind": "value",
              "ty": {
                "ByteArray": 32
              }
            }
          }
        ]
      },
      {
        "name": "pauseable",
        "index": 2,
        "kind": "module",
        "fields": [
          {
            "name": "is_paused",
            "index": 1,
            "kind": "value",
            "ty": "Bool"
          }
        ]
      },
      {
        "name": "metadata",
        "index": 3,
        "kind": "module",
        "fields": [
          {
            "name": "contract_name",
            "index": 1,
            "kind": "module",
            "fields": []
          },
          {
            "name": "contract_description",
            "index": 2,
            "kind": "module",
            "fields": []
          },
          {
            "name": "contract_icon_uri",
            "index": 3,
            "kind": "module",
            "fields": []
          },
          {
            "name": "contract_project_uri",
            "index": 4,
            "kind": "module",
            "fields": []
          }
        ]
      },
      {
        "name": "state",
        "index": 4,
        "kind": "value",
        "ty": "MarketState"
      },
      {
        "name": "price_feed",
        "index": 5,
        "kind": "value",
        "ty": "Key"
      },
      {
        "name": "price_feed_id",
        "index": 6,
        "kind": "value",
        "ty": "String"
      },
      {
        "name": "fee",
        "index": 7,
        "kind": "value",
        "ty": "U256"
      },
      {
        "name": "long_token",
        "index": 8,
        "kind": "value",
        "ty": "Key"
      },
      {
        "name": "short_token",
        "index": 9,
        "kind": "value",
        "ty": "Key"
      },
      {
        "name": "wcspr_token",
        "index": 10,
        "kind": "value",
        "ty": "Key"
      },
      {
        "name": "fee_collector",
        "index": 11,
        "kind": "value",
        "ty": "Key"
      }
    ]
  },
  "types": [
    {
      "struct": {
        "name": "AddressMarketState",
        "description": null,
        "members": [
          {
            "name": "market_state",
            "description": null,
            "ty": "MarketState"
          },
          {
            "name": "is_paused",
            "description": null,
            "ty": "Bool"
          },
          {
            "name": "fee",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "wcspr_balance",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "long_token_balance",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "short_token_balance",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "market_allowance",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "long_position_value",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "short_position_value",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "total_position_value",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "long_share_percentage",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "short_share_percentage",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "config",
            "description": null,
            "ty": "Config"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "Config",
        "description": null,
        "members": [
          {
            "name": "long_token",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "short_token",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "wcspr_token",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "fee_collector",
            "description": null,
            "ty": "Key"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "ConfigUpdated",
        "description": null,
        "members": [
          {
            "name": "admin",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "long_token",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "short_token",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "wcspr_token",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "fee_collector",
            "description": null,
            "ty": "Key"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "FeeCollected",
        "description": null,
        "members": [
          {
            "name": "amount",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "fee_collector",
            "description": null,
            "ty": "Key"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "LongDeposited",
        "description": null,
        "members": [
          {
            "name": "user",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "wcspr_amount",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "long_tokens_minted",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "fee_collected",
            "description": null,
            "ty": "U256"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "LongWithdrawn",
        "description": null,
        "members": [
          {
            "name": "user",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "long_tokens_burned",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "wcspr_amount",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "fee_collected",
            "description": null,
            "ty": "U256"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "MarketState",
        "description": null,
        "members": [
          {
            "name": "long_total_supply",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "short_total_supply",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "long_liquidity",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "short_liquidity",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "price",
            "description": null,
            "ty": "U256"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "Paused",
        "description": null,
        "members": [
          {
            "name": "account",
            "description": null,
            "ty": "Key"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "PriceFeedUpdated",
        "description": null,
        "members": [
          {
            "name": "admin",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "price_feed_address",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "price_feed_id",
            "description": null,
            "ty": "String"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "PriceUpdated",
        "description": null,
        "members": [
          {
            "name": "new_price",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "previous_price",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "timestamp",
            "description": null,
            "ty": "U64"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "RoleAdminChanged",
        "description": null,
        "members": [
          {
            "name": "role",
            "description": null,
            "ty": {
              "ByteArray": 32
            }
          },
          {
            "name": "previous_admin_role",
            "description": null,
            "ty": {
              "ByteArray": 32
            }
          },
          {
            "name": "new_admin_role",
            "description": null,
            "ty": {
              "ByteArray": 32
            }
          }
        ]
      }
    },
    {
      "struct": {
        "name": "RoleGranted",
        "description": null,
        "members": [
          {
            "name": "role",
            "description": null,
            "ty": {
              "ByteArray": 32
            }
          },
          {
            "name": "address",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "sender",
            "description": null,
            "ty": "Key"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "RoleRevoked",
        "description": null,
        "members": [
          {
            "name": "role",
            "description": null,
            "ty": {
              "ByteArray": 32
            }
          },
          {
            "name": "address",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "sender",
            "description": null,
            "ty": "Key"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "ShortDeposited",
        "description": null,
        "members": [
          {
            "name": "user",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "wcspr_amount",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "short_tokens_minted",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "fee_collected",
            "description": null,
            "ty": "U256"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "ShortWithdrawn",
        "description": null,
        "members": [
          {
            "name": "user",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "short_tokens_burned",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "wcspr_amount",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "fee_collected",
            "description": null,
            "ty": "U256"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "Unpaused",
        "description": null,
        "members": [
          {
            "name": "account",
            "description": null,
            "ty": "Key"
          }
        ]
      }
    }
  ]
}
```

</details>

The `PositionToken` layout is the same for both tokens, only `contract` differs. Its `token`
submodule is where the CEP-18 named keys and dictionaries show up: `decimals`, `symbol`, `name`
and `total_supply` are named keys, `balances` is a dictionary keyed by `Key` with base64 encoded
item keys, and `allowances` a dictionary keyed by an `(owner, spender)` tuple with hashed item
keys.

<details>
<summary><code>resources/storage/CD_LONG.json</code></summary>

```json
{
  "version": 1,
  "contract": "CD_LONG",
  "ident": "PositionToken",
  "layout": {
    "kind": "module",
    "fields": [
      {
        "name": "token_type",
        "index": 1,
        "kind": "value",
        "ty": "LongOrShort"
      },
      {
        "name": "token",
        "index": 2,
        "kind": "module",
        "fields": [
          {
            "name": "decimals",
            "index": 1,
            "kind": "named_key",
            "key_name": "decimals",
            "ty": "U8"
          },
          {
            "name": "symbol",
            "index": 2,
            "kind": "named_key",
            "key_name": "symbol",
            "ty": "String"
          },
          {
            "name": "name",
            "index": 3,
            "kind": "named_key",
            "key_name": "name",
            "ty": "String"
          },
          {
            "name": "total_supply",
            "index": 4,
            "kind": "named_key",
            "key_name": "total_supply",
            "ty": "U256"
          },
          {
            "name": "balances",
            "index": 5,
            "kind": "dictionary",
            "dictionary_name": "balances",
            "key": "Key",
            "key_encoding": "base64",
            "value": "U256"
          },
          {
            "name": "allowances",
            "index": 6,
            "kind": "dictionary",
            "dictionary_name": "allowances",
            "key": {
              "Tuple2": [
                "Key",
                "Key"
              ]
            },
            "key_encoding": "hex_hash",
            "value": "U256"
          }
        ]
      },
      {
        "name": "access_control",
        "index": 3,
        "kind": "module",
        "fields": [
          {
            "name": "roles",
            "index": 1,
            "kind": "mapping",
            "key": {
              "Tuple2": [
                {
                  "ByteArray": 32
                },
                "Key"
              ]
            },
            "value": {
              "kind": "value",
              "ty": "Bool"
            }
          },
          {
            "name": "role_admin",
            "index": 2,
            "kind": "mapping",
            "key": {
              "ByteArray": 32
            },
            "value": {
              "kind": "value",
              "ty": {
                "ByteArray": 32
              }
            }
          }
        ]
      },
      {
        "name": "metadata",
        "index": 4,
        "kind": "module",
        "fields": [
          {
            "name": "contract_name",
            "index": 1,
            "kind": "module",
            "fields": []
          },
          {
            "name": "contract_description",
            "index": 2,
            "kind": "module",
            "fields": []
          },
          {
            "name": "contract_icon_uri",
            "index": 3,
            "kind": "module",
            "fields": []
          },
          {
            "name": "contract_project_uri",
            "index": 4,
            "kind": "module",
            "fields": []
          }
        ]
      },
      {
        "name": "market",
        "index": 5,
        "kind": "value",
        "ty": "Key"
      },
      {
        "name": "wcspr",
        "index": 6,
        "kind": "value",
        "ty": "Key"
      },
      {
        "name": "peer_transfers_enabled",
        "index": 7,
        "kind": "value",
        "ty": "Bool"
      }
    ]
  },
  "types": [
    {
      "struct": {
        "name": "Burn",
        "description": null,
        "members": [
          {
            "name": "owner",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "amount",
            "description": null,
            "ty": "U256"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "DecreaseAllowance",
        "description": null,
        "members": [
          {
            "name": "owner",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "spender",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "allowance",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "decr_by",
            "description": null,
            "ty": "U256"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "IncreaseAllowance",
        "description": null,
        "members": [
          {
            "name": "owner",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "spender",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "allowance",
            "description": null,
            "ty": "U256"
          },
          {
            "name": "inc_by",
            "description": null,
            "ty": "U256"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "Mint",
        "description": null,
        "members": [
          {
            "name": "recipient",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "amount",
            "description": null,
            "ty": "U256"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "RoleAdminChanged",
        "description": null,
        "members": [
          {
            "name": "role",
            "description": null,
            "ty": {
              "ByteArray": 32
            }
          },
          {
            "name": "previous_admin_role",
            "description": null,
            "ty": {
              "ByteArray": 32
            }
          },
          {
            "name": "new_admin_role",
            "description": null,
            "ty": {
              "ByteArray": 32
            }
          }
        ]
      }
    },
    {
      "struct": {
        "name": "RoleGranted",
        "description": null,
        "members": [
          {
            "name": "role",
            "description": null,
            "ty": {
              "ByteArray": 32
            }
          },
          {
            "name": "address",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "sender",
            "description": null,
            "ty": "Key"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "RoleRevoked",
        "description": null,
        "members": [
          {
            "name": "role",
            "description": null,
            "ty": {
              "ByteArray": 32
            }
          },
          {
            "name": "address",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "sender",
            "description": null,
            "ty": "Key"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "SetAllowance",
        "description": null,
        "members": [
          {
            "name": "owner",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "spender",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "allowance",
            "description": null,
            "ty": "U256"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "Transfer",
        "description": null,
        "members": [
          {
            "name": "sender",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "recipient",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "amount",
            "description": null,
            "ty": "U256"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "TransferFrom",
        "description": null,
        "members": [
          {
            "name": "spender",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "owner",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "recipient",
            "description": null,
            "ty": "Key"
          },
          {
            "name": "amount",
            "description": null,
            "ty": "U256"
          }
        ]
      }
    },
    {
      "enum": {
        "name": "LongOrShort",
        "description": null,
        "variants": [
          {
            "name": "Long",
            "description": null,
            "discriminant": 0,
            "ty": "Unit"
          },
          {
            "name": "Short",
            "description": null,
            "discriminant": 1,
            "ty": "Unit"
          }
        ]
      }
    }
  ]
}
```

</details>

## The storage reader

The reader is the `odra-storage-reader` crate of the Odra repository, compiled to wasm with
`wasm-bindgen`. You do not need to build it: the compiled module and its JavaScript bindings are
in the `resources` directory of the [Odra repository]. Copy three files into your project:

- `odra_storage_reader.wasm` - the wasm module,
- `odra_storage_reader.js` - the bindings that load the module and expose the `StorageReader`
  class,
- `odra_storage_reader.d.ts` - the TypeScript types of the bindings.

The `StorageReader` class has a handful of methods:

| Method | What it does |
|---|---|
| `new StorageReader(layout)` | Creates a reader from the layout file, given as a JSON string or a parsed object. |
| `contract` | The name of the contract, from the layout file. |
| `currentContractHash(storedValue)` | Picks the current contract version (`hash-...`) out of the package record the node returns for the package hash. |
| `locate(path, keys)` | Resolves a dotted field path, and the keys of the mappings and dictionaries on it, to the location of the value: a dictionary item or a named key. |
| `decode(clValue, location)` | Decodes the `CLValue` the node returned for a location into a readable string, formatted like `odra-cli` prints it. |
| `decodeRaw(clValue, location)` | Returns the stored bytes as hex instead of decoding them. |
| `readableFields()` | Lists every value that can be read from the layout, with its path, the key types it needs, its type and where it is stored. |
| `fields()` | The layout tree itself. |

Errors, such as an unknown field or a key in the wrong format, are thrown as JavaScript errors.

## Project setup

Create a Node project with `casper-js-sdk` and `tsx` to run TypeScript directly:

```sh
mkdir casper-delta-storage && cd casper-delta-storage
npm init -y
npm pkg set type=module
npm install casper-js-sdk@5.1.1
npm install --save-dev tsx typescript @types/node
mkdir reader storage
```

Copy the three reader files into `reader/`, and the layout files into `storage/`:

```
casper-delta-storage/
├── reader/
│   ├── odra_storage_reader.wasm
│   ├── odra_storage_reader.js
│   └── odra_storage_reader.d.ts
├── storage/
│   ├── Market.json
│   ├── CD_LONG.json
│   └── CD_SHORT.json
└── read.ts
```

## The script

`read.ts` takes a layout file, a package hash, a field path and, when the field needs them, the
keys of the mappings on the path. A read is five steps, numbered in the code.

```ts title="read.ts" showLineNumbers
import { readFileSync } from "node:fs";
import {
  HttpHandler,
  ParamDictionaryIdentifier,
  ParamDictionaryIdentifierContractNamedKey,
  RpcClient
} from "casper-js-sdk";
import init, { StorageReader } from "./reader/odra_storage_reader.js";

const NODE_URL = "https://node.mainnet.casper.network/rpc";
// The node's answer for a key that was never written.
const QUERY_FAILED = -32003;
// casper-js-sdk throws an `HttpError` with the RPC error as `sourceErr`.
const isNotSet = (e: any) => (e?.sourceErr?.code ?? e?.code) === QUERY_FAILED;

const [layoutPath, packageHash, path, ...keys] = process.argv.slice(2);
if (!layoutPath || !packageHash || !path) {
  console.error("usage: npx tsx read.ts <layout.json> <package-hash> <path> [key...]");
  process.exit(1);
}

// 1. Load the wasm module and create the reader from the layout file.
await init({
  module_or_path: readFileSync(new URL("./reader/odra_storage_reader.wasm", import.meta.url))
});
const reader = new StorageReader(readFileSync(layoutPath, "utf8"));
const rpc = new RpcClient(new HttpHandler(NODE_URL));

// 2. The package hash resolves to its current contract, the one that holds the storage.
//    `rawJSON` is the node's JSON, which the reader takes.
const pkg = await rpc.queryLatestGlobalState(packageHash, []);
const contractHash = reader.currentContractHash(pkg.rawJSON.stored_value);

// 3. The path and the keys resolve to where the value is stored.
const location = reader.locate(path, keys);

try {
  // 4. Fetch it: a dictionary item or a named key of the contract.
  const result =
    location.kind === "dictionary"
      ? await rpc.getDictionaryItemByIdentifier(
          null,
          new ParamDictionaryIdentifier(
            undefined,
            new ParamDictionaryIdentifierContractNamedKey(
              contractHash,
              location.dictionaryName,
              location.dictionaryItemKey
            )
          )
        )
      : await rpc.queryLatestGlobalState(contractHash, [location.name]);

  // 5. Decode the stored value with the types of the layout file.
  const clValue = result.rawJSON.stored_value.CLValue;
  console.log(`${reader.contract}.${path} = ${reader.decode(clValue, location)}`);
} catch (e) {
  if (isNotSet(e)) {
    console.log(`${reader.contract}.${path} = <not set>`);
  } else {
    throw e;
  }
}
```

A few things worth noticing:

- **Loading the wasm.** The bindings' `init()` looks for a file named
  `odra_storage_reader_bg.wasm` next to `odra_storage_reader.js` when called without arguments.
  The copied module is named `odra_storage_reader.wasm`, so we read it from disk and pass the
  bytes. In a browser you would pass the URL of the file instead.
- **The package and the contract.** The addresses Odra prints are package hashes. The storage
  belongs to the current contract version of the package, so the first query resolves the
  package to its contract with `currentContractHash`, and every later query goes to that
  contract hash.
- **Two ways to fetch.** The location the reader returns has a `kind`. A `dictionary` location
  carries `dictionaryName` and `dictionaryItemKey`, for `state_get_dictionary_item`. A
  `named_key` location carries the `name`, for `query_global_state` on the contract with that
  name as the path. Regular Odra fields always live in the `state` dictionary; named keys and
  other dictionaries come from modules like `Cep18` that store data the Casper way.
- **Values that were never written.** The node answers with error `-32003 Query failed` for a
  dictionary item or a named key that does not exist. The script prints `<not set>` for it.

## Reading the Market

Let's start with the plain `Var`s of the `Market`. The `state` field holds a `MarketState`
struct; the reader decodes it to JSON with the members from the layout's `types`:

```sh
export MARKET=hash-4b15cdbc606589ebfdcdb3f8f81e2a2a0d44298e3d1faf0743d2be2d90d8cb6b
npx tsx read.ts storage/Market.json $MARKET state
```

```
Market.state = {
  "long_total_supply": "329652995320483",
  "short_total_supply": "3739127615001",
  "long_liquidity": "108343534759043",
  "short_liquidity": "112851258302944",
  "price": "246"
}
```

Numbers come back as decimal strings, so a `U256` is never truncated:

```sh
npx tsx read.ts storage/Market.json $MARKET fee
```

```
Market.fee = 200
```

An `Address` is printed as a Casper `Key`, a `Hash` for a contract package and an `Account` for
an account. The `long_token` field is how we learned the package hash of `CD_LONG` in the table
above:

```sh
npx tsx read.ts storage/Market.json $MARKET long_token
npx tsx read.ts storage/Market.json $MARKET fee_collector
```

```
Market.long_token = Key::Hash(30f66fc8f60ee99e7a8a05c3a308ee623c229247c0cc7ac8dc76621157397a93)
Market.fee_collector = Key::Account(330d575f8440e26fe5aa632245f5c2f1cb09af9c5088ce3a2c8e082966810939)
```

Fields of a submodule are reached with a dotted path. The `Pauseable` flag of the Market has
never been written, so the node has no value for it:

```sh
npx tsx read.ts storage/Market.json $MARKET pauseable.is_paused
```

```
Market.pauseable.is_paused = <not set>
```

### Mapping keys

A `Mapping` needs a key. Keys are passed to `locate` as text, one per `Mapping`, `List` item or
dictionary on the path, in path order, in the same format `odra-cli` accepts:

| Key type | Text format | Example |
|---|---|---|
| `Key` (an `Address`) | `hash-...` or `account-hash-...` | `account-hash-330d57...` |
| `U8`..`U512`, `I32`, `I64` | a decimal number | `42` |
| `String` | the text itself | `CSPRUSD` |
| `Bool` | `true` or `false` | `true` |
| `ByteArray(32)` | `0x` followed by hex; a shorter pattern is repeated to the full length | `0x06` |
| `Option<T>` | `none` or `some:<T>` | `some:42` |
| `Tuple2<A, B>` | the two parts separated by `:` | `0x06:account-hash-...` |

The `roles` mapping of `AccessControl` is keyed by `(Role, Address)`, where a `Role` is 32 bytes.
Casper Delta's `PriceManager` role is `[6u8; 32]`, which in the text format is `0x06`: the single
byte is repeated to fill the 32 bytes. To check whether an account holds that role:

```sh
npx tsx read.ts storage/Market.json $MARKET access_control.roles 0x06:account-hash-<the account>
```

The reader hashes the field indices and the serialized key into the `state` dictionary item key,
exactly as the [Storage Layout] article describes, so the location depends on the account:

```json
{
  "kind": "dictionary",
  "dictionaryName": "state",
  "dictionaryItemKey": "<blake2b of the field indices and the serialized key, hex>",
  "type": "Bool"
}
```

For an account that holds the role the value is `true`. For one that was never granted it the
item does not exist and the script prints `<not set>`. Note that a tuple is one key, so
`0x06:account-hash-...` is a single argument; passing the role and the account as two arguments
fails with `expected tuple with 2 elements, found 1`.

## Reading a position token

The `Cep18` module stores its data the way the CEP-18 standard requires, under named keys and in
dictionaries named `balances` and `allowances`, and the layout file says so. The reader returns
a `named_key` location for the metadata and the total supply, so the script fetches them with
`query_global_state`:

```sh
export CD_LONG=hash-30f66fc8f60ee99e7a8a05c3a308ee623c229247c0cc7ac8dc76621157397a93
npx tsx read.ts storage/CD_LONG.json $CD_LONG token.total_supply
```

```
CD_LONG.token.total_supply = 329652995320483
```

The location for it is:

```json
{ "kind": "named_key", "name": "total_supply", "type": "U256" }
```

The remaining `Var`s of the token read like those of the Market. `token_type` is a `Var` holding
the `LongOrShort` enum, and it decodes to the variant name:

```sh
npx tsx read.ts storage/CD_LONG.json $CD_LONG token_type
npx tsx read.ts storage/CD_LONG.json $CD_LONG token.symbol
npx tsx read.ts storage/CD_LONG.json $CD_LONG market
```

```
CD_LONG.token_type = Long
CD_LONG.token.symbol = CD_LONG
CD_LONG.market = Key::Hash(4b15cdbc606589ebfdcdb3f8f81e2a2a0d44298e3d1faf0743d2be2d90d8cb6b)
```

### Balances and allowances

A balance is an item of the `balances` dictionary, keyed by the account. The layout file records
that CEP-18 encodes the item key as base64 of the serialized `Key`, and the reader applies it:

```sh
npx tsx read.ts storage/CD_LONG.json $CD_LONG token.balances account-hash-<the account>
```

```json
{
  "kind": "dictionary",
  "dictionaryName": "balances",
  "dictionaryItemKey": "<base64 of the serialized key>",
  "type": "U256"
}
```

An allowance is keyed by the `(owner, spender)` tuple, so it takes one `owner:spender` key, and
CEP-18 hashes it into the item key:

```sh
npx tsx read.ts storage/CD_LONG.json $CD_LONG token.allowances account-hash-<the owner>:account-hash-<the spender>
```

Either prints the amount as a decimal string, or `<not set>` for an account that never held the
token or never approved the spender.

## What can be read

You do not have to read the layout file to know which paths exist and which keys they need.
`readableFields()` lists every value, and a frontend can build its forms from it:

```ts
const reader = new StorageReader(readFileSync("storage/CD_LONG.json", "utf8"));
console.log(reader.readableFields());
```

```json
[
  { "path": "token_type", "keys": [], "type": "LongOrShort", "storage": { "kind": "value" } },
  { "path": "token.decimals", "keys": [], "type": "U8", "storage": { "kind": "named_key", "name": "decimals" } },
  { "path": "token.total_supply", "keys": [], "type": "U256", "storage": { "kind": "named_key", "name": "total_supply" } },
  { "path": "token.balances", "keys": ["Key"], "type": "U256", "storage": { "kind": "dictionary", "name": "balances" } },
  { "path": "token.allowances", "keys": [{ "Tuple2": ["Key", "Key"] }], "type": "U256", "storage": { "kind": "dictionary", "name": "allowances" } },
  { "path": "access_control.roles", "keys": [{ "Tuple2": [{ "ByteArray": 32 }, "Key"] }], "type": "Bool", "storage": { "kind": "value" } },
  ...
]
```

A `Mapping` is not a value itself, so it does not appear; its key is added to the `keys` of the
values under it.

## Raw bytes

`decode` needs the type of the value, and a custom type is only in the layout file when it
appears in an entry point or an event of the contract. A struct that is only stored cannot be
decoded; `decodeRaw` returns its bytes as hex instead, and the error message of `decode` carries
them too:

```
Cannot decode the stored value: type `Config` is not defined in the layout file (raw: 0x0102)
```

## Summary

Reading the storage of an Odra contract from JavaScript takes a layout file generated with
`cargo odra schema`, the reader's wasm and bindings copied from the Odra repository, and an RPC
client. The reader resolves a field path to a dictionary item or a named key, the client fetches
it, and the reader decodes it with the contract's own types. The same five steps work for any
Odra contract, on any network, from a script or a browser.

[Storage Layout]: ../advanced/04-storage-layout.md
[Build, Deploy and Read the State of a Contract]: ./build-deploy-read.md
[Casper Delta]: https://github.com/kubaplas/casper-delta
[Odra repository]: https://github.com/odradev/odra/tree/release/2.10.0/resources
