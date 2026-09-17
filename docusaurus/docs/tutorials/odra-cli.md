---
sidebar_position: 12
---

# Odra CLI

The Odra CLI library allows you to create CLI clients for your contracts. Instead of using `casper-client` with
complex incantations, you can use the Odra CLI library to create a client that will be able to call your contract methods
directly, by name, and with the correct arguments.

## Example

Let's go through an example available in the odra repository to see how to use the Odra CLI library.
It creates a CLI tool for a useful `DogContract`.

### Cargo.toml

To use the Odra CLI library in your project, you need to add `odra-cli` to your `Cargo.toml` file, alongside a new binary:

```toml
[dependencies]
...
odra-cli = "2"
...

[[bin]]
name = "odra-cli"
path = "bin/odra-cli.rs"
```

Then, create an empty file in the `bin` directory named `odra-cli.rs`.

### Deploy script

The first type of script we can create is a deploy script. It is used to deploy the contract to the network and store the address of the deployed contract in a container for later use.

Only one deploy script can be used in a single CLI tool, and it is executed when the user runs the `deploy` command.

```rust title="bin/odra-cli.rs"
use odra::host::HostEnv;
use odra_cli::{
    cspr,
    deploy::DeployScript,
    DeployerExt, DeployedContractsContainer,
};
use odra_examples::features::storage::variable::{DogContract, DogContractInitArgs};

/// Deploys the `DogContract` and adds it to the container.
pub struct DeployDogScript;

impl DeployScript for DeployDogScript {
    fn deploy(
        &self,
        env: &HostEnv,
        container: &mut DeployedContractsContainer
    ) -> Result<(), odra_cli::deploy::Error> {
        env.set_gas(cspr!(350));
        let dog_contract = DogContract::try_deploy(
            env,
            DogContractInitArgs {
                barks: true,
                weight: 10,
                name: "Mantus".to_string()
            }
        )?;
        container.add_contract(&dog_contract)?;

        // By default, a contract is non-upgradeable, you can change it by passing `InstallConfig`
        _ = DogContract::try_deploy_with_cfg(
            env,
            DogContractInitArgs {
                barks: true,
                weight: 10,
                name: "Mantus".to_string()
            },
            InstallConfig::upgradable::<DogContract>(),
        )?;

        // Alternatively, you can use the `DeployerExt` trait to deploy the contract:
        _ = DogContract::load_or_deploy(
            env,
            DogContractInitArgs {
                barks: true,
                weight: 10,
                name: "Mantus".to_string()
            },
            container,
            cspr!(350)
        )?;

        // You can use `load_or_deploy_with_cfg` to deploy the contract with a custom configuration
         _ = DogContract::load_or_deploy_with_cfg(
            env,
            None, // an optional package name, e.g. Some("my_dog".to_string())
            DogContractInitArgs {
                barks: true,
                weight: 10,
                name: "Mantus".to_string()
            },
            InstallConfig::upgradable::<DogContract>(),
            container,
            cspr!(350)
        )?;
        Ok(())
    }
}
```

In the example above, we see a few alternative implementations of a simple `DeployScript` for our `DogContract`. All of them set the gas limit,
deploy the contract and adds it to a container.

1. `DogContract::try_deploy` method, which deploys the contract every time the script is run. 
2. `DogContract::try_deploy_with_cfg` also deploys a contract everytime, but passes [`InstallConfig`] instance to configure the deployment using a factory method `InstallConfig::upgradable`.
3.  Utilizes the [`DeployerExt`] trait, which checks if the contract is already deployed and returns the existing instance if it is, or deploys it if it is not. It is a convenient way to ensure that the contract is deployed only once. It is useful when you want to add more contracts to the script in the future and avoid redeploying previously deployed contracts. 
4. The last option is to use `DeployerExt::load_or_deploy_with_cfg` that works like the previous one, but accepts a custom configuration.

The address of the deployed contract is stored in a TOML file in the `resources` directory, which is created automatically by the Odra CLI library.

Outside of a deploy script - in a plain livenet binary, say - the same file spares you copying package
hashes around. [`ContractLoaderExt`] is implemented for every contract:

```rust
use odra_cli::ContractLoaderExt;

// `resources/contracts.toml`, or `resources/<chain>-contracts.toml` when ODRA_CASPER_LIVENET_CHAIN_NAME is set
let dog = DogContract::load_from_default_file(&env)?;
// any file, relative to the project root
let dog = DogContract::load_from_file(&env, "resources/casper-test-contracts.toml")?;
// a contract registered under a custom package name
let dog = DogContract::load_from_file_named(&env, "resources/contracts.toml", Some("dog-2".into()))?;
```

A missing or malformed file is an error, as is a contract that is not in it.

:::tip
Gas amounts are expressed in motes, which makes them long and easy to mistype. The `cspr!` macro
converts CSPR to motes at compile time, so `cspr!(350)` is `350_000_000_000` and `cspr!(2.5)` is
`2_500_000_000`.
:::

:::note
`DeployerExt::load_or_deploy` and `load_or_deploy_with_cfg` reset the gas limit back to `0` once
the contract is deployed. This prevents a large deployment gas limit from silently leaking into the
calls that follow, so remember to call `env.set_gas()` again before any subsequent mutable call.
:::

### Scenarios

Scenarios are a way to run multiple calls one after another, and can be used to test the contract or perform complex operations
like setting up the dependencies between contracts.
To create a scenario, you need to implement the `Scenario` trait and add it to the `OdraCli` instance in the main function.
A scenario also implements the `ScenarioMetadata` trait, which provides metadata about the scenario, such as its name and description. You can use this metadata to display the scenario in the CLI tool and provide a description of what it does.

```rust title="bin/odra-cli.rs"
use odra_cli::{
    scenario::{Args, Error, Scenario, ScenarioMetadata},
    CommandArg, ContractProvider, DeployedContractsContainer,
};
use std::vec;

pub struct DogCheckScenario;

impl Scenario for DogCheckScenario {
    fn args(&self) -> Vec<CommandArg> {
        vec![CommandArg::new(
            "name",
            "The name of the dog",
            NamedCLType::String,
        ).required()]
    }

    fn run(
        &self,
        env: &HostEnv,
        container: &DeployedContractsContainer,
        args: Args
    ) -> Result<(), Error> {
        let dog_contract = container.contract_ref::<DogContract>(env)?;
        let test_name = args.get_single::<String>("name")?;

        let actual_name = dog_contract.try_name()?;
        if test_name != actual_name {
            odra_cli::log(format!("Dog name mismatch: expected {actual_name}"));
            return Err(Error::OdraError {
                message: "Error".to_string()
            });
        }

        Ok(())
    }
}

impl ScenarioMetadata for DogCheckScenario {
    const NAME: &'static str = "check";
    const DESCRIPTION: &'static str =
        "Checks if the name of the deployed dog matches the provided name";
}
```

A scenario must implement the `Scenario` trait, which requires defining the `args` and `run` methods.
The `args` method returns a vector of `CommandArg` that defines the arguments that the scenario accepts.
In this case, we define a single argument `name` of type `String`, which is required - the program will
fail at parse time if the argument is not provided.

The `run` method is where the scenario logic is implemented. It receives the `HostEnv`, a container with deployed contracts, and the arguments passed to the scenario. To load the contract, we use the `ContractProvider` trait, which allows us to get a reference to the contract by its type. The trait is implemented for the `DeployedContractsContainer`, which is passed to the `run` method.
To read the arguments, we use the `Args` type, which provides two methods: `get_single` and `get_many`. In this case, we use `get_single` to get the value of the `name` argument.
If we want to get multiple values for an argument, we must define the argument as `CommandArg::new("name", "The name of the dog", NamedCLType::String).list()`, where `list()` indicates that the argument can be provided multiple times.

The example above performs a simple check on the return value of one of the methods.
Of course, there is no limit to how complex a scenario can be.

:::tip
Prefer returning a `scenario::Error` over panicking with `assert!`. A returned error is reported by
the CLI as a failed command, while a panic tears the
process down with a raw Rust backtrace. Use `odra_cli::log` to print progress from inside a
scenario so the output matches the rest of the CLI.
:::

### Contract methods

To interact with the contract methods, we can use the `contract` command. The Odra CLI automatically generates commands for each contract method, allowing us to call them directly by name. But first, we need to register the contract in the `OdraCli` instance.

### Builder

Now, let's put everything together in the main function. We will use the `OdraCli` builder to create a CLI tool that can deploy the contract, call its methods, and run scenarios.

```rust title="bin/odra-cli.rs"
use odra_cli::OdraCli;

/// Main function to run the CLI tool.
pub fn main() {
    OdraCli::new()
        .about("Dog contract cli tool")
        .deploy(DeployDogScript)
        .contract::<DogContract>()
        .scenario(DogCheckScenario)
        .build()
        .run();
}
```

This code creates a new `OdraCli` instance, sets the description of the tool, adds the deploy script, registers the `DogContract`, and adds the scenario. Finally, it builds the CLI tool and runs it.

## How to use it

Assuming the correct [livenet](../backends/04-livenet.md) environment is set up, you can run the CLI tool using the following command:

```bash
cargo run --bin odra-cli
```

This will display all of our options:

```bash
Dog contract cli tool

Usage: odra_cli [OPTIONS] <COMMAND>

Commands:
  deploy        Runs the deploy script
  contract      Commands for interacting with contracts
  scenario      Commands for interacting with scenarios
  print-events  Prints the most recent events emitted by a contract
  whoami        Prints the address of the current caller.
  status        Lists deployed contracts and their registration status
  inspect       Prints the entry points, arguments and types of a contract
  config        Prints the resolved livenet configuration
  transfer      Transfers native CSPR from the caller to an account or contract
  completions   Generates a shell completion script (bash, zsh, fish, ...)
  repl          Starts an interactive REPL session, keeping the host environment warm across commands.
  help          Print this message or the help of the given subcommand(s)

Options:
  -c, --contracts-toml <PathBuf>  The path to the file with the deployed contracts. Relative to the project root.
      --json                      Emit machine-readable JSON instead of human-readable text (read commands only)
      --state-root-hash <HEX>     Read the chain state as of this state root hash (hex) instead of the latest one. Commands that send transactions fail while it is set.
  -h, --help                      Print help
```

`--state-root-hash` turns any read - a contract getter, `inspect`, `storage`, `whoami` - into a
look at the chain as it was at that root, which is how you answer "what was the balance before
that transaction?". It applies to the whole invocation (or REPL session); `deploy`, `transfer` and
mutable contract calls fail while it is set.

By default, contracts are written/read to/from the `contracts.toml` file, which is located in the `resources` directory, but you can specify a different path using the `-c` or `--contracts-toml` option. If `ODRA_CASPER_LIVENET_CHAIN_NAME` is set, the file is named after the chain instead - for example `resources/casper-test-contracts.toml` - so deployments on different networks never overwrite each other.

Apart from `deploy`, `contract` and `scenario`, which you register yourself, every CLI gets the
`whoami`, `status`, `inspect`, `config`, `transfer`, `completions` and `repl` commands for free -
no registration needed.

### Missing configuration

The CLI needs a working [livenet](../backends/04-livenet.md) environment. If any of the
`ODRA_CASPER_LIVENET_*` variables is missing - or the secret key cannot be loaded - the CLI no
longer aborts immediately. Instead it asks for the missing value, sets it for the current process
and retries:

```bash
cargo run --bin odra_cli -- whoami

⚠️  WARN : Livenet configuration is incomplete.
💁  INFO : Enter the values below to continue (empty input or Ctrl-D aborts).
🔗  LINK : https://odra.dev/docs/backends/livenet#setup
💁  INFO : Node RPC address  ($ODRA_CASPER_LIVENET_NODE_ADDRESS)
💁  INFO :   e.g. http://localhost:11101
  > http://localhost:11101
💁  INFO : Save this configuration to /home/kuba/Projekty/my_project/.env for next time?
  [y/N] > y
💁  INFO : Saved configuration to /home/kuba/Projekty/my_project/.env
```

When you accept the offer, the values are written to a `.env` file in the current directory -
existing `VAR=...` lines are updated in place and comments are preserved - so the next run starts
without any prompting.

:::note
Prompting only happens on an interactive terminal. In CI, or whenever stdin is not a TTY, the CLI
keeps the old fail-fast behaviour: it prints which variable is missing and exits with a non-zero
status.
:::

### JSON output

The global `--json` flag replaces the human-readable output with pretty-printed JSON. Being global,
it can be placed anywhere:

```bash
cargo run --bin odra_cli -- --json status
cargo run --bin odra_cli -- status --json
```

```json
{
  "contracts_file": "/home/kuba/Projekty/my_project/resources/contracts.toml",
  "file_exists": true,
  "entry_count": 1,
  "last_updated": "2026-07-13T10:33:55Z",
  "registered": [
    {
      "key_name": "DogContract",
      "ident": "DogContract",
      "deployed": true,
      "address": "hash-53b3486180b2a9506fbb0523ed159b1908cec628d091b19cbe74e057e7ebbc8b"
    }
  ],
  "unregistered": []
}
```

This makes the CLI usable from scripts and CI without parsing the emoji-prefixed log lines.
`contract`, `scenario`, `print-events`, `whoami`, `status`, `inspect`, `config` and `transfer`
render a JSON report; `deploy`, `completions` and `repl` ignore the flag. Amounts that can exceed
JSON's safe integer range (balances, transferred motes) are serialized as strings.

:::caution
`--json` only affects the final report of a successful command. Two things are always plain text:

- **Errors.** Failures - a reverting scenario, a bad argument, a missing config - are printed as
  emoji-prefixed text, never as a JSON error object.
- **Transaction progress.** Mutable calls still log their deploy/wait/confirm lines to stdout before
  the JSON block.

A script should therefore check the exit code for success, and parse the *last* JSON object in stdout
rather than treating the whole stream as JSON.
:::

### Deploy command

First, we need to deploy the contract:

```bash
cargo run --bin odra_cli deploy
```

This gives us the following output:

```bash
cargo run --bin odra_cli -- deploy
   Compiling odra-examples v2.1.0 (/home/kuba/Projekty/odra/odra/examples)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.65s
     Running `../target/debug/odra_cli deploy`
💁  INFO : Deploy mode: default
💁  INFO : Found wasm under "wasm/DogContract.wasm".
💁  INFO : Deploying "DogContract".
🙄  WAIT : Waiting 10 for V1(TransactionV1Hash(4230d5ca3113d87190e4136cefe097bd08fea03c841ce5e4df73a049e10208f1)).
💁  INFO : Transaction "4230d5ca3113d87190e4136cefe097bd08fea03c841ce5e4df73a049e10208f1" successfully executed.
🔗  LINK : 
💁  INFO : Contract "contract-package-53b3486180b2a9506fbb0523ed159b1908cec628d091b19cbe74e057e7ebbc8b" deployed.
💁  INFO : Deployment completed successfully.
```

This will run the deploy script and create a new file in the `resources` directory - named `contracts.toml`, or `<chain>-contracts.toml` when `ODRA_CASPER_LIVENET_CHAIN_NAME` is set, as it normally is:

```toml
last_updated = "2025-07-03T10:33:55Z"

[[contracts]]
name = "DogContract"
package_name = "DogContract"
package_hash = "hash-53b3486180b2a9506fbb0523ed159b1908cec628d091b19cbe74e057e7ebbc8b"
```

All the calls to the contract will be made using this package hash, unless you specify a different one using the `-c` or `--contracts-toml` option.

The `--deploy-mode` option decides what happens to the contracts already recorded in that file:

| Mode | Behaviour |
| --- | --- |
| `default` | Use the existing contract if it is already recorded, otherwise deploy a new one. |
| `override` | Force a redeploy and overwrite the existing contract configuration. |
| `archive` | Force a redeploy, archive the existing contracts file and start a new one. |

```bash
cargo run --bin odra_cli -- deploy --deploy-mode override
```

### Contract command

To call a contract method, we need to use the `contract` command. The command itself will display all the available contracts:

```bash
cargo run --bin odra_cli -- contract
```

This outputs:

```bash
Commands for interacting with contracts

Usage: odra_cli contract <COMMAND>

Commands:
  DogContract  Commands for interacting with the DogContract contract
  help         Print this message or the help of the given subcommand(s)
```

And when a contract is selected, it will show us the available methods:

```bash
cargo run --bin odra_cli -- contract DogContract
```

```bash
Commands for interacting with the DogContract contract

Usage: odra_cli contract DogContract <COMMAND>

Commands:
  barks               Returns true if the dog barks.
  weight              Returns the dog's weight.
  name                Returns the dog's name.
  walks_amount        Adds a walk to the dog's walks.
  walks_total_length  Returns the total length of the dog's walks.
  rename              It is uncommon but you can change the dog's name.
  help                Print this message or the help of the given subcommand(s)
```

To run a command, compose a command like this:

```bash
cargo run --bin odra_cli -- contract DogContract barks
```

This will result in:

```bash
💁  INFO : Call result: true
```

If you run a command that requires arguments, it will display an error message:

```bash
cargo run --bin odra_cli -- contract DogContract rename 

error: the following required arguments were not provided:
  --new_name <String>
  --gas <AMOUNT (motes, or 'X.Y cspr')>

Usage: odra_cli contract DogContract rename --new_name <String> --gas <AMOUNT (motes, or 'X.Y cspr')>

For more information, try '--help'.
```

The error message above indicates that the `rename` method requires two arguments: `new_name` and `gas`. In the code,
the `rename` method is mutable and takes a single argument `new_name` of type `String`.
As the entry point is mutable and requires a real transaction, the `gas` argument is also required to specify how much
gas to use for the call. A bare number is read as motes, but you can also write the amount in CSPR -
`--gas "2.5 cspr"` is the same as `--gas 2500000000`.

Let's run the command with the required arguments:

```bash
cargo run --bin odra_cli -- contract DogContract rename --new_name "Doggy" --gas 200000000

error: invalid value '200000000' for '--gas <AMOUNT (motes, or 'X.Y cspr')>': Gas must be at least 2.5 CSPR (2,500,000,000 motes).
```

As the minimum gas amount for a transaction is 2.5 CSPRs, we need to increase the gas amount to at least that value:

```bash
cargo run --bin odra_cli -- contract DogContract rename --new_name "Doggy" --gas 2500000000

💁  INFO : Calling "contract-package-0eda9544d667775d8e5503543dd8ba0996d439fd9ded79cfe28454d07f42df3a" directly with entrypoint "rename".
🙄  WAIT : Waiting 10 for V1(TransactionV1Hash(e9d2e7f9d7d832cbf64e6e9eb09404423757e354a1ed7420c0398d851fea3a40)).
💁  INFO : Transaction "e9d2e7f9d7d832cbf64e6e9eb09404423757e354a1ed7420c0398d851fea3a40" successfully executed.
🔗  LINK : 
💁  INFO : Call executed successfully, but no result was returned.

# Verifying the name change
cargo run --bin odra_cli -- contract DogContract name

💁  INFO : Call result: Doggy
```

There are more options available for the `contract` command that we can discover by running the `help` command:

```bash
cargo run --bin odra_cli -- contract DogContract rename --help

It is uncommon but you can change the dog's name.

Usage: odra_cli contract DogContract rename [OPTIONS] --new_name <String> --gas <AMOUNT (motes, or 'X.Y cspr')>

Options:
      --new_name <String>
      --attached_value <AMOUNT (motes, or 'X.Y cspr')>  The amount of CSPRs attached to the call
      --gas <AMOUNT (motes, or 'X.Y cspr')>             The amount of gas to attach to the call
  -p, --print-events                                    Print events emitted by the contract
  -h, --help
```

If you want to print the events emitted by the contract, you can use the `--print-events` option. This will print all the events emitted by the contract during the call.

```bash
cargo run --bin odra_cli -- contract DogContract rename --new_name "Doggy" --gas 2500000000 --print-events

💁  INFO : Calling "contract-package-0eda9544d667775d8e5503543dd8ba0996d439fd9ded79cfe28454d07f42df3a" directly with entrypoint "rename".
🙄  WAIT : Waiting 10 for V1(TransactionV1Hash(f2f473d46b59c136052f687539ab76e5fbb3af958c483e3a382b5a0e498227c4)).
💁  INFO : Transaction "f2f473d46b59c136052f687539ab76e5fbb3af958c483e3a382b5a0e498227c4" successfully executed.
🔗  LINK : 
💁  INFO : Captured 1 events for contract 'DogContract'
💁  INFO : Event 1: 'NameChanged':
  'old_name': Mantus
  'new_name': Doggy

💁  INFO : Call executed successfully, but no result was returned.
```

For a payable method, you can use the `--attached_value` option to specify the amount of CSPRs to attach to the call. Like `--gas`, it accepts either motes or a CSPR amount such as `"1.5 cspr"`.

With `--json`, the same call returns the decoded result and the captured events as a single object:

```bash
cargo run --bin odra_cli -- --json contract DogContract rename --new_name "Doggy" --gas 2500000000 --print-events
```

```json
{
  "contract": "DogContract",
  "entry_point": "rename",
  "result": null,
  "events": [
    {
      "contract": "DogContract",
      "events": [
        "'NameChanged':\n  'old_name': Mantus\n  'new_name': Doggy\n"
      ]
    }
  ]
}
```

### Print-events command

The `print-events` command allows you to print the most recent events emitted by a contract. It is useful for debugging and understanding what is happening in the contract.

You can run it like this:

```bash
cargo run --bin odra_cli -- print-events DogContract --help

Print events of the DogContract contract

Usage: odra_cli print-events DogContract [OPTIONS]

Options:
  -n, --number <N>  Number of events to print [default: 10]
  -h, --help        Print help

cargo run --bin odra_cli -- print-events DogContract -n 2

💁  INFO : Printing 2 most recent events for contract 'DogContract'
💁  INFO : Event 1: 'NameChanged':
  'old_name': Mantus
  'new_name': Doggy

💁  INFO : Event 2: 'NameChanged':
  'old_name': Rex
  'new_name': Mantus

```

By default, it prints the last 10 events, but you can specify a different number using the `-n` or `--number` option.

With `--json` each event also carries its index in the contract's on-chain event log:

```json
{
  "contract": "DogContract",
  "count": 2,
  "events": [
    { "index": 3, "data": "'NameChanged':\n  'old_name': Mantus\n  'new_name': Doggy\n" },
    { "index": 2, "data": "'NameChanged':\n  'old_name': Rex\n  'new_name': Mantus\n" }
  ]
}
```

### Scenario command

Scenarios registered in the `OdraCli` instance can be run using the `scenario` command. It displays all the available scenarios:

```bash
cargo run --bin odra_cli -- scenario
```

This will output:

```bash
Commands for running user-defined scenarios

Usage: odra_cli scenario <COMMAND>

Commands:
  check  Checks if the name of the deployed dog matches the provided name
  help   Print this message or the help of the given subcommand(s)
```

It can be run like this:

```bash
cargo run --bin odra_cli -- scenario check --name Doggy
```

On success, this will output:

```bash
💁  INFO : Scenario executed successfully
```

And when the scenario returns an error, the CLI reports it and exits with a non-zero status:

```bash
💁  INFO : Dog name mismatch: expected Mantus
🤦  ERROR : Odra error: Error
```

### Whoami command

The `whoami` command prints the address, public key and CSPR balance of the current caller — that is, the account configured in your livenet environment. It is included automatically in every `OdraCli` build and requires no explicit registration.

```bash
cargo run --bin odra_cli -- whoami
```

This will output:

```bash
💁  INFO : Address: account-hash-a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3
💁  INFO : Public key: 01c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4
💁  INFO : Balance: 998.234 CSPR (998234000000 motes)
```

This is useful for verifying which account will sign transactions - and whether it can still afford to - before deploying or calling a contract.

### Status command

The `status` command answers the question "what is actually deployed right now?". It reads the contracts file and cross-references it with the contracts registered in the `OdraCli` builder.

```bash
cargo run --bin odra_cli -- status
```

```bash
💁  INFO : Contracts file: /home/kuba/Projekty/my_project/resources/casper-net-1-contracts.toml
💁  INFO : File status:    exists (1 entry)
💁  INFO : Last updated:   2026-07-13T10:33:55Z
💁  INFO : Registered contracts:
💁  INFO :   [deployed]     DogContract (DogContract) -> hash-53b3486180b2a9506fbb0523ed159b1908cec628d091b19cbe74e057e7ebbc8b
💁  INFO :   [not deployed] CatContract (CatContract)
```

Contracts recorded in the file but never added to the builder are listed separately as a warning. Such a contract cannot be called and normally aborts the CLI at startup, so seeing it here usually means the contracts file is stale, or a `.contract::<T>()` call is missing from the builder.

### Inspect command

The `inspect` command prints the entry points of a contract, their arguments, return types, and the custom types and events it declares. It reads the contract schema, so it works even before anything is deployed.

```bash
cargo run --bin odra_cli -- inspect DogContract
```

```bash
💁  INFO : Contract: DogContract (DogContract)
💁  INFO : Entry points:
💁  INFO :   [view] barks() -> true|false
💁  INFO :            Returns true if the dog barks.
💁  INFO :   [view] weight() -> UINT
💁  INFO :            Returns the dog's weight.
💁  INFO :   [view] name() -> TEXT
💁  INFO :            Returns the dog's name.
💁  INFO :   [view] walks_amount() -> UINT
💁  INFO :            Adds a walk to the dog's walks.
💁  INFO :   [view] walks_total_length() -> UINT
💁  INFO :            Returns the total length of the dog's walks.
💁  INFO :   [mutable] rename(new_name: TEXT) -> (empty)
💁  INFO :            It is uncommon but you can change the dog's name.
💁  INFO : Types & events:
💁  INFO :   NameChanged
```

Types are shown as the CLI value hints you would type on the command line, not as Rust type names - so a `String` argument is displayed as `TEXT`, a `U256` as `DECIMAL` and an `Address` as `hash-...|account-hash-...`.

Running `inspect` without a contract name describes every registered contract. Combined with `--json`, this is a convenient way to feed the contract interface to other tooling.

### Config command

The `config` command prints the livenet configuration the CLI resolved, so you can confirm which network and account you are about to talk to before sending anything.

```bash
cargo run --bin odra_cli -- config
```

```bash
💁  INFO : Livenet configuration:
💁  INFO :   Node address: http://localhost:11101
💁  INFO :   Chain name: casper-net-1
💁  INFO :   Events URL: http://localhost:18101/events
💁  INFO :   Secret key path: ./keys/secret_key.pem
💁  INFO : Caller address:  account-hash-a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3
💁  INFO : Contracts file:  resources/casper-net-1-contracts.toml
```

Variables that are unset or empty are reported as `<not set>` together with the name of the environment variable that would provide them.

:::note
Only the *path* to the secret key is printed, never its content.
:::

### Transfer command

The `transfer` command sends native CSPR from the configured caller to an account or a contract, without going through any contract entry point.

```bash
cargo run --bin odra_cli -- transfer \
  --to account-hash-5e3725bec4389ea63151903f5c9005233d19a569c5e593e5bbd83b05714f7364 \
  --amount "10.5 cspr"
```

```bash
💁  INFO : Transfer completed successfully.
 10500000000 motes (10.5 cspr) from
account-hash-a2b3...a2b3 -> account-hash-5e37...7364
```

Like every other CSPR amount in the CLI, `--amount` accepts a plain number of motes or a CSPR amount such as `"10.5 cspr"`.

### Completions command

The `completions` command writes a shell completion script for the whole generated command tree - including your contracts, their entry points and your scenarios - to stdout.

```bash
# bash
cargo run --bin odra_cli -- completions bash > /etc/bash_completion.d/odra_cli

# zsh
cargo run --bin odra_cli -- completions zsh > "${fpath[1]}/_odra_cli"

# fish
cargo run --bin odra_cli -- completions fish > ~/.config/fish/completions/odra_cli.fish
```

### Repl command

Every command shown so far pays the cost of setting up the host environment from scratch. The `repl` command starts an interactive session that keeps that environment - and the deployed-contracts container - warm across commands.

```bash
cargo run --bin odra_cli -- repl
```

```bash
💁  INFO : Odra CLI interactive session — chain `casper-net-1`
💁  INFO : Caller: account-hash-a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3
💁  INFO : Type `help` for available commands, `exit` or Ctrl-D to quit.
⬡ casper-net-1  ·  Account(AccountH…a2b3)  ·  casper-net-1-contracts.toml (1 contract)
casper-net-1> contract DogContract name
💁  INFO : Call result: Doggy
```

Inside a session:

- The prompt is the chain name (or `odra>` when no chain is configured), preceded by a status line showing the network, the caller and how many contracts the session knows about. The status line is refreshed on every prompt, so a contract deployed mid-session shows up immediately.
- All commands except `repl` itself are available, and `<Tab>` completes command, contract, entry point and scenario names.
- `help` prints the command tree, `exit`, `quit` or Ctrl-D leaves the session, Ctrl-C cancels the current line.
- A parse error or a failing command is reported and the prompt returns - a bad line never kills the session.
- History is kept in `$HOME/.odra_cli_history` and reloaded on the next session.
- Running `deploy` registers the freshly deployed contracts right away, so they are callable without restarting.

:::note
The `--contracts-toml` option has no effect inside a session. The container is fixed for the
lifetime of the REPL - choose the file when starting it, e.g.
`cargo run --bin odra_cli -- -c resources/my-contracts.toml repl`.
:::

## Conclusion

The Odra CLI library provides a powerful and convenient way to create command-line tools for your Odra contracts. It simplifies the process of deploying, interacting with, and testing your contracts, allowing you to focus on the business logic of your application. By following the examples in this tutorial, you can create your own CLI tools and streamline your development workflow.

[`InstallConfig`]: https://docs.rs/odra/2.9.0/odra/host/struct.InstallConfig.html
[`ContractLoaderExt`]: https://docs.rs/odra-cli/latest/odra_cli/trait.ContractLoaderExt.html
[`DeployerExt`]: https://docs.rs/odra-cli/2.9.0/odra_cli/trait.DeployerExt.html