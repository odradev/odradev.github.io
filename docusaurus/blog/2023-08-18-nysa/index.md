---
slug: Nysa
title: Nysa
authors: [kpob]
---

The Oder River, known as "Odra" in Polish, is one of the major rivers in Poland. It flows for approximately 854 kilometers, originating in the Czech Republic and flowing through southwestern Poland before emptying into the Baltic Sea. The river is a vital transportation route, connecting several Polish cities, including Wrocław, Szczecin, and Gdańsk, to international waterways. The Oder also plays a significant role in the region's ecology, supporting diverse habitats and species. Its watershed area spans multiple countries, making it a part of various international cooperation initiatives aimed at water management and environmental conservation.

The Nysa Kłodzka is a significant river in Poland, flowing through the country's southwestern part. It travels approximately 188 kilometers, originating in the Czech Republic and merging with the Oder River in Poland. The river passes through picturesque landscapes, including the Kłodzko Valley, and plays a crucial role in local ecosystems. Its waters are harnessed for various purposes, such as hydroelectric power generation and irrigation.

Oh, wait, shouldn't it be a tech blog?

This is a valid question, we will get back to it in a moment.

<!--truncate-->

## Odra

A short reminder:

> Odra is a high-level smart contract framework for Rust, which encourages rapid development and clean, pragmatic design ...
> it takes care of much of the hassle of smart contract development, enabling you to focus on writing your dapp without reinventing the wheel. 
>
> [Odra][odra]

Understanding that people generally dislike learning new things, we've kept this in mind throughout development. Since day one, we have focused on creating Odra with the largest group of smart contract developers in mind - those familiar with Solidity. The Odra Framework is designed to flatten the learning curve for this group.

A Solidity developer will encounter familiar concepts such as:

* Constructors
* Payable functions
* Mappings
* Reverts
* Current caller
* Current block time
* A standard module library (similar to OpenZeppelin)
* And more

:::note
It's important to note that the Odra Framework is intentionally blockchain-agnostic. Its design does not target any particular blockchain. 

Ultimately, Odra is built to support multiple blockchains, allowing the writing of smart contracts in Rust.
:::

Having so many similarities, why not take the next step and transpile Solidity code into Odra code?

This is where Nysa comes into play.

## Nysa

Solidity and Rust share some syntax similarities despite being designed for different purposes. Both languages emphasize strong typing, pattern matching, and immutability by default.

Nysa performs Solidity-to-Rust transpilation through four simple steps.

![nysa-gen](./nysa_generic.drawio.svg)

1. **Solidity Parser**
   
Firstly, we need a well-structured Rust representation of Solidity code. Nysa utilizes [LALRPOP][lalrpop] - a Rust parser generator framework. In the further steps, this enables us to conduct static analysis of the Solidity code, ranging from contract context down to individual expressions.

```rust title=solidity-parser/src/pt.rs
// The representation of a Solidity contract
#[derive(Debug, PartialEq)]
pub struct ContractDefinition {
    pub doc: Vec<DocComment>,
    pub loc: Loc,
    pub ty: ContractTy,
    pub name: Identifier,
    pub base: Vec<Base>,
    pub parts: Vec<ContractPart>,
}
```

2. **C3 Linearization**
   
One of the most notable distinctions between Rust and Solidity is their approach to inheritance. Rust says `No, thx`, whereas Solidity opts for `The more, the better`. Speaking more technically, Solidity supports multiple inheritance with [C3 linearization][c3].

:::info
The primary purpose of the C3 Linearization Algorithm is to establish a consistent and unambiguous order of method resolution in cases where there might be ambiguity or conflicts due to multiple inheritance. It ensures that the inherited methods are called in a predictable and well-defined sequence based on the class hierarchy and the order in which classes are defined.
:::

For simulating C3 linearization, Nysa utilizes an [implementation][c3-impl] of the C3 linearization in Rust written by [Maciej Zieliński][z1elony], so everything stays in the Odra family.

3. **Nysa Parser**

After that, we step to the essential part, converting Solidity code into Rust code.

For example, a Solidity event.

```solidity
event Transfer(address indexed from, address indexed to, uint256 value);
```
can easily be represented as an plain Rust struct - the same name, the same fields, similar types. 

```rust
#[derive(PartialEq, Eq, Debug)]
pub struct Transfer {
    from: Option<Address>,
    to: Option<Address>,
    value: U256,
}
```

The same we do with contracts, interfaces, libraries, errors, variables, functions, statements, etc.

Here is a snippet of the expression parser:

```rust title=nysa/src/parser/odra/expr/mod.rs
pub fn parse<T>(expression: &Expression, ctx: &mut T) -> Result<syn::Expr, ParserError>
where
    T: StorageInfo + TypeInfo + EventsRegister + ExternalCallsRegister + ContractInfo + FnContext,
{
    match expression {
        Expression::Require { condition, error } => error::revert(Some(condition), error, ctx),
        Expression::ZeroAddress => Ok(parse_quote!(None)),
        Expression::Add { left, right } => math::add(left, right, ctx),
        Expression::Subtract { left, right } => math::sub(left, right, ctx),
        Expression::Increment { expr } => {
            let expr = parse(expr, ctx)?;
            Ok(parse_quote!(#expr += 1))
        }
        Expression::ExternalCall {
            variable,
            fn_name,
            args,
        } => parse_ext_call(variable, fn_name, args, ctx),
        Expression::Type { ty } => {
            let ty = ty::parse_plain_type_from_ty(ty, ctx)?;
            Ok(parse_quote!(#ty))
        }
        Expression::BoolLiteral(b) => Ok(parse_quote!(#b)),
        ...
    }
}

```

4. **Printing the code**

The last step is just consuming the resulting C3 AST. Nysa produces a token stream from the AST. Most likely you would write it to a file.

And there you are: a Rust smart contract is ready to be compiled!

### Nysa + Odra
By design, Nysa is a universal tool, so the third step from the pipeline is replaceable. In other words, a Solidity input can be converted to Rust code supporting a framework/SDK of your choice unless you provide a parser implementation.

However, the default implementation is `OdraParser`, which takes a contract written in Solidity and splits out an Odra module.

I hope you see an analogy to the first two paragraphs at this point. Nysa the river and Nysa the transpiler `flow into` Odra.

![nysa-odra](./nysa_odra.drawio.svg)

## Examples

### Status message

Let's get our hands dirty and create a very simple project. We will write a contract that stores a single mapping of records - an address to a string message.

To set up the project, we use `cargo odra`.
``` bash
cargo odra new -n status -t blank
cd status
```

The first thing is to add Nysa to the project and create a rudimentary `build.rs` where we define the input - a solidity contract and the output - an Odra module generated by Nysa.

```toml title=Cargo.toml
[build-dependencies]
nysa = { version = "0.1.0", features = ["builder"] }
```

```rust title=build.rs
const DEST_FILE_PATH: &str = "src/status_message.rs";
const SOURCE_FILE_PATH: &str = "src/status_message.sol";

fn main() {
    nysa::builder::generate_file::<&str, nysa::OdraParser>(SOURCE_FILE_PATH, DEST_FILE_PATH);
}
```

Next, implement the contract. Naturally, a Solidity one.

```solidity title=src/status_message.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract StatusMessage {
    mapping(address => string) records;

    function setStatus(string memory status) public payable {
        address accountId = msg.sender;
        records[accountId] = status;
    }

    function getStatus(address accountId) public view returns (string memory) {
        return records[accountId];
    }
}
```

The contract has a single mapping `records`  that stores a message and its owner. Additionally, exposes two entry points: `setStatus` (sets current's sender message) and `getStatus`.

Following, let's define a `lib.rs` file.

```rust title=src/lib.rs
mod status_message;
pub use status_message::{StatusMessage, StatusMessageDeployer, StatusMessageRef};

#[cfg(test)]
mod test;
```
The file is straightforward: registers a `status_message` rust module, reexports some Odra abstractions, and adds a test module.

Lastly, we can test our contract.
Like the original solidity contract, our Odra contract exposes two entry points: `set_message()` and `get_message()`.
The test code looks like [any other][odra-docs-testing] Odra test: we use `StatusMessageDeployer` to instantiate a contract, which gets us a reference to interact with the contract.

```rust title=src/test.rs
use odra::{test_env, types::Address};
use super::*;

const ACCOUNT: fn() -> Address = || odra::test_env::get_account(1);

#[test]
fn set_get_message() {
    let mut contract = StatusMessageDeployer::default();

    test_env::set_caller(ACCOUNT());
    contract.set_status("hello".to_string());
    assert_eq!("hello".to_string(), contract.get_status(Some(ACCOUNT())));
}

#[test]
fn get_nonexistent_message() {
    let contract = StatusMessageDeployer::default();

    assert_eq!(
        String::new(),
        contract.get_status(Some(ACCOUNT()))
    );
}
```

```bash
cargo odra test # test against MockVM
# or
cargo odra test -b casper # build a wasm file and test against CasperVM
```

```
status-message
├── src
│   ├── lib.rs
│   ├── status_message.sol
│   └── test.rs
├── build.rs
├── Cargo.toml
└── Odra.toml
```

Full example available [here][nysa-status-example].

### CappedErc20

A more complex, real-world example is a `CappedErc20` contract. It is a ERC20 [Ownable][oz-ownable], [Burnable][oz-burnable] and [Capped][oz-capped] token contract.

```solidity title=plascoin.sol
// ...
// rest of the code

contract Plascoin is ERC20Capped, ERC20Burnable, Ownable {
    constructor(string memory name_, string memory symbol_, uint256 cap_, address initialOwner) ERC20(name_, symbol_) ERC20Capped(cap_) Ownable(initialOwner) {
    }

    function mint(address account, uint256 amount) public onlyOwner {
        _mint(account, amount);
    }

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Capped) {
        super._update(from, to, value);
    }
}
```
You can check out the full source code [here][nysa-capped-erc20-sol].

Deployment of such a contract onto the Casper testnet is straightforward. We are just two steps from it. 

```sh
# to make sure the contract works as expected 
# we execute cargo odra test command to build and run tests
cargo odra test -b casper

# deploy onto the testnet
casper-client put-deploy
    --node-address {{NODE_ADDRESS}}
    --chain-name casper-test
    --secret-key {{SECRET_KEY}} \
    --session-path {{CONTRACT_WASM}} \
    --payment-amount 130000000000 \
    --session-arg "odra_cfg_package_hash_key_name:string:'{{CONTRACT_PACKAGE_HASH_NAMED_KEY}}'" \
    --session-arg "odra_cfg_allow_key_override:bool:'true'" \
    --session-arg "odra_cfg_is_upgradable:bool:'true'" \
    --session-arg "odra_cfg_constructor:string:'init'" \
    --session-arg "name:string='{{name}}'" \
    --session-arg "symbol:string='{{symbol}}'" \
    --session-arg "cap:u256='{{cap}}'" \
    --session-arg "initial_owner:opt_key='{{owner}}'"
```

Literally in 5 minutes I was able to:
1. Build a wasm file from Solidity source code
2. Successfully [deploy][nysa-deploy] the contract onto Testnet,
3. [Mint][nysa-mint] some tokens,
4. And [transfer][nysa-transfer] them.
   
Finally, we compare the costs of Solidity-to-Odra contract and a native CEP-18 implementation. Despite the contracts being different in terms of the internal logic and exposed entry points, such comparison gives us some insight into Nysa's efficiency.

| action    | CEP-18               | Nysa                  |
|-----------|----------------------|-----------------------|
| deploy    | [143.87][cep-deploy] | [93.37][nysa-deploy]  |
| transfer  | [1.29][cep-transfer] | [1.36][nysa-transfer] |

## Conclusion

Nysa is at early stage of development, but already has shown a huge potential. In a few simple steps, you can take advantage of an existing smart contract and convert it an Odra module. The module can be a standalone contract, or a building block of a bigger contract.

[lalrpop]: https://github.com/lalrpop/lalrpop
[c3]: https://en.wikipedia.org/wiki/C3_linearization
[c3-impl]: https://github.com/odradev/c3-lang
[z1elony]: https://github.com/zie1ony
[odra]: https://odra.dev/docs/
[odra-discord]: https://discord.gg/Mm5ABc9P8k
[odra-twitter]: https://twitter.com/odradev
[odra-wiki]: https://en.wikipedia.org/wiki/Oder
[nysa-wiki]: https://en.wikipedia.org/wiki/Eastern_Neisse
[nysa-capped-erc20-sol]: https://github.com/odradev/nysa/blob/feature/odra/examples/capped-erc20/src/plascoin.sol
[nysa-capped-erc20]: https://github.com/odradev/nysa/blob/feature/odra/examples/capped-erc20/
[nysa-status-example]: https://github.com/odradev/nysa/tree/feature/odra/examples/status-message/nysa
[odra-docs-testing]: https://odra.dev/docs/basics/testing
[cep-deploy]: https://testnet.cspr.live/deploy/2b5d17ea5d9c093c4252705285f7aeabe58cff37fb48b5837567908e2d91329a
[cep-transfer]: https://testnet.cspr.live/deploy/3ab866e7cf7b59e081f12aea4103f9552b261b601d91b072ea10ab5be6cf0e45
[nysa-deploy]: https://testnet.cspr.live/deploy/b1dd9628f8a36b7ed24949f88ea97ebb21d0c213e9cc87fc5ee4076074de0c88
[nysa-mint]: https://testnet.cspr.live/deploy/1def539f806fd39ec1b75687c46946c7510fe3bb15860fcc3420c7bea7e7f10f
[nysa-transfer]: https://testnet.cspr.live/deploy/0e2e0fa490f00783ddaecd06aaf2b43d8c5f6d3224a28a31ad66bfef48ce26e6
[open-zeppelin]: https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts
[oz-ownable]: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol
[oz-capped]: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/extensions/ERC20Capped.sol
[oz-burnable]: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/extensions/ERC20Burnable.sol