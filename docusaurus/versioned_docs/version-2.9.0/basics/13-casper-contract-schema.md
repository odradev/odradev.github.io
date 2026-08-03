---
sidebar_position: 10
description: Casper Contract Schema
---

# Casper Contract Schema

 Working in collaboration with the Casper Association we designed the [Casper Contract Schema] (CCS). This a standardize description of smart contracts. This is a crucial step enhancing tool development and increasing ecosystem interoperability.

## Odra and CCS

There is almost nothing you need to do to use CCS in your Odra project. The only thing to be taken care of is using odra attributes namely: `module`, `event`, `odra_error` and `odra_type`. The schema will be generated for you and available in the `resources` directory.


:::note
If you forget to register events and errors in the module attribute, the definition remains valid; however, the errors and events will not be incorporated into the schema.
:::

```rust showLineNumbers title="src/contract.rs"
use odra::prelude::*;

#[odra::module(
    // the name of the contract, default is the module name
    name = "MyContract",
    // the version of the contract, default is the version of the crate
    version = "0.1.0",   
     // events that the contract can emit, collected recursively if submodules are used
    events = [          
        Created,
        Updated
    ],
    // the error enum the contract can revert with, collected recursively if submodules are used
    errors = MyErrors   
)]
pub struct MyContract {
    name: Var<String>,
    owner: Var<Address>,
}

#[odra::module]
impl MyContract {
    /// Initializes the contract, sets the name and owner and emits an event
    pub fn init(&mut self, name: String, owner: Address) {
        self.name.set(name.clone());
        self.owner.set(owner.clone());
        self.env().emit_event(Created { name });
    }

    /// Updates the name of the contract and emits an event
    pub fn update(&mut self, name: String) {
        self.name.set(name.clone());
        self.env().emit_event(Updated { name });
    }

    /// Returns the data of the contract
    pub fn get_data(&self) -> Data {
        Data {
            name: self.name.get_or_default(),
            owner: self.owner.get_or_revert_with(MyErrors::InvalidOwner),
        }
    }
}

// The struct will we visible in the schema in the types section
#[odra::odra_type]
pub struct Data {
    name: String,
    owner: Address,
}

// The enum variants will we visible in the schema in the errors section
#[odra::odra_error]
pub enum MyErrors {
    /// The owner is invalid
    InvalidOwner,
    /// The name is invalid
    InvalidName,
}

// The struct will we visible in the schema in the types and events section
#[odra::event]
pub struct Updated {
    name: String,
}

// The struct will we visible in the schema in the types section and events section
#[odra::event]
pub struct Created {
    name: String,
}
```


## Generating the Schema

To generate the schema run the following `cargo-odra` command:

```bash
cargo odra schema # or pass -c flag to generate the schema for a specific contract
```

## Schema Output

The generated schema will be available in the `resources` directory. The schema is a JSON file that contains all the information about the contract. Here is an example of the generated schema:

```json showLineNumbers title="resources/my_contract_schema.json"
{
  "casper_contract_schema_version": 1,
  "toolchain": "rustc 1.77.0-nightly (5bd5d214e 2024-01-25)",
  "authors": [],
  "repository": null,
  "homepage": null,
  "contract_name": "MyContract",
  "contract_version": "0.1.0",
  "types": [
    {
      "struct": {
        "name": "Created",
        "description": null,
        "members": [
          {
            "name": "name",
            "description": null,
            "ty": "String"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "Data",
        "description": null,
        "members": [
          {
            "name": "name",
            "description": null,
            "ty": "String"
          },
          {
            "name": "owner",
            "description": null,
            "ty": "Key"
          }
        ]
      }
    },
    {
      "struct": {
        "name": "Updated",
        "description": null,
        "members": [
          {
            "name": "name",
            "description": null,
            "ty": "String"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "name": "InvalidName",
      "description": "The name is invalid",
      "discriminant": 1
    },
    {
      "name": "InvalidOwner",
      "description": "The owner is invalid",
      "discriminant": 0
    }
  ],
  "entry_points": [
    {
      "name": "update",
      "description": "Updates the name of the contract and emits an event",
      "is_mutable": true,
      "arguments": [
        {
          "name": "name",
          "description": null,
          "ty": "String",
          "optional": false
        }
      ],
      "return_ty": "Unit",
      "is_contract_context": true,
      "access": "public"
    },
    {
      "name": "get_data",
      "description": "Returns the data of the contract",
      "is_mutable": false,
      "arguments": [],
      "return_ty": "Data",
      "is_contract_context": true,
      "access": "public"
    }
  ],
  "events": [
    {
      "name": "Created",
      "ty": "Created"
    },
    {
      "name": "Updated",
      "ty": "Updated"
    }
  ],
  "call": {
    "wasm_file_name": "MyContract.wasm",
    "description": "Initializes the contract, sets the name and owner and emits an event",
    "arguments": [
      {
        "name": "odra_cfg_package_hash_key_name",
        "description": "The arg name for the package hash key name.",
        "ty": "String",
        "optional": false
      },
      {
        "name": "odra_cfg_allow_key_override",
        "description": "The arg name for the allow key override.",
        "ty": "Bool",
        "optional": false
      },
      {
        "name": "odra_cfg_is_upgradable",
        "description": "The arg name for the contract upgradeability setting.",
        "ty": "Bool",
        "optional": false
      },
      {
        "name": "odra_cfg_is_upgrade",
        "description": "The arg name for the contract upgrade setting.",
        "ty": "Bool",
        "optional": false
      },
      {
        "name": "name",
        "description": null,
        "ty": "String",
        "optional": false
      },
      {
        "name": "owner",
        "description": null,
        "ty": "Key",
        "optional": false
      }
    ]
  }
}
```


## Schema Fields

* `casper_contract_schema_version` is the version of the schema.
`toolchain` is the version of the Rust compiler used to compile the contract.
* Fields `authors`, `repository`, and `homepage` are optional and can be set in the `Cargo.toml` file.
* `contract_name` is the name of the contract - by default is the module name, may be overriden by the module attribute.
* `contract_version` denotes the version of the contract, defaulting to the version specified in the `Cargo.toml` file, but can be overridden by the `module` attribute.
* `types` comprises a list of custom structs and enums defined within the contract. Each struct or enum includes a name, description (not currently supported, with the value set to `null`), and a list of members.
* `errors` is a list of error enums defined within the contract. Each error includes a name, description (the first line of the variant documentation), and a discriminant.
* `entry_points` is a list of contract functions that can be called from the outside. Each entry point includes a name, description (not currently supported, with the value set to `null`), whether the function is mutable, a list of arguments, the return type, whether the function is called in the contract context, and the access level.
* `events` is a list of events that the contract can emit. Each event includes a name and the type (earlier defined in `types`) of the event.
* The `call` section provides details regarding the contract's `call` function, which executes upon contract deployment. It includes the name of the Wasm file, a description (reflecting the constructor's description, typically the `init` function), and a list of arguments. These arguments are a combination of Odra configuration arguments and constructor arguments.


 [Casper Contract Schema]: https://github.com/odradev/casper-contract-schema