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
        env.set_gas(350_000_000_000);
        let dog_contract = DogContract::try_deploy(
            env,
            DogContractInitArgs {
                barks: true,
                weight: 10,
                name: "Mantus".to_string()
            }
        )?;
        container.add_contract(&dog_contract)?;

        // Alternatively, you can use the `DeployerExt` trait to deploy the contract:
        _ = DogContract::load_or_deploy(
            env,
            DogContractInitArgs {
                barks: true,
                weight: 10,
                name: "Mantus".to_string()
            },
            container,
            350_000_000_000
        )?;

        Ok(())
    }
}
```

In the example above, we see two alternative implementations of a simple `DeployScript` for our `DogContract`. Both set the gas limit,
deploy the contract and adds it to a container.
The first one uses the `DogContract::try_deploy` method, which deploys the contract every time the script is run.
The second one uses the `DeployerExt` trait, which checks if the contract is already deployed and returns the existing instance if it is, or deploys it if it is not. It is a convenient way to ensure that the contract is deployed only once. It is useful when you want to add more contracts to the script in the future and avoid redeploying previously deployed contracts.

The address of the deployed contract is stored in a TOML file in the `resources` directory, which is created automatically by the Odra CLI library.

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

        env.set_gas(50_000_000);
        let actual_name = dog_contract.try_name()?;

        assert_eq!(test_name, actual_name, "Dog name mismatch");

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
  help          Print this message or the help of the given subcommand(s)

Options:
  -c, --contracts-toml <PathBuf>  The path to the file with the deployed contracts. Relative to the project root.
  -h, --help                      Print help
```

By default, contracts are written/read to/from the `contracts.toml` file, which is located in the `resources` directory, but you can specify a different path using the `-c` or `--contracts-toml` option.

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
💁  INFO : Found wasm under "wasm/DogContract.wasm".
💁  INFO : Deploying "DogContract".
🙄  WAIT : Waiting 10 for V1(TransactionV1Hash(4230d5ca3113d87190e4136cefe097bd08fea03c841ce5e4df73a049e10208f1)).
💁  INFO : Transaction "4230d5ca3113d87190e4136cefe097bd08fea03c841ce5e4df73a049e10208f1" successfully executed.
🔗  LINK : 
💁  INFO : Contract "contract-package-53b3486180b2a9506fbb0523ed159b1908cec628d091b19cbe74e057e7ebbc8b" deployed.
💁  INFO : Command executed successfully
```

This will run the deploy script and create a new file in the `resources` directory named `contracts.toml`:

```toml
last_updated = "2025-07-03T10:33:55Z"

[[contracts]]
name = "DogContract"
package_hash = "hash-53b3486180b2a9506fbb0523ed159b1908cec628d091b19cbe74e057e7ebbc8b"
```

All the calls to the contract will be made using this package hash, unless you specify a different one using the `-c` or `--contracts-toml` option.

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
  help                Print this message or the help of the given subcommand(s)
```

To run a command, compose a command like this:

```bash
cargo run --bin odra_cli -- contract DogContract barks
```

This will result in:

```bash
💁  INFO : Call result: true
💁  INFO : Command executed successfully
```

If you run a command that requires arguments, it will display an error message:

```bash
cargo run --bin odra_cli -- contract DogContract rename 

error: the following required arguments were not provided:
  --new_name <String>
  --gas <U64>

Usage: odra_cli contract DogContract rename --new_name <String> --gas <U64>

For more information, try '--help'.
```

The error message above indicates that the `rename` method requires two arguments: `new_name` and `gas`. In the code,
the `rename` method is mutable and takes a single argument `new_name` of type `String`.
As the entry point is mutable and requires a real transaction, the `gas` argument is also required to specify how much
gas to use for the call. The gas amount is denominated in motes.

Let's run the command with the required arguments:

```bash
cargo run --bin odra_cli -- contract DogContract rename --new_name "Doggy" --gas 200000000

error: invalid value '200000000' for '--gas <U64>': 200000000 is not in 2500000000..18446744073709551615
```

As the minimum gas amount for a transaction is 2.5 CSPRs, we need to increase the gas amount to at least that value:

```bash
cargo run --bin odra_cli -- contract DogContract rename --new_name "Doggy" --gas 2500000000

💁  INFO : Calling "contract-package-0eda9544d667775d8e5503543dd8ba0996d439fd9ded79cfe28454d07f42df3a" directly with entrypoint "rename".
🙄  WAIT : Waiting 10 for V1(TransactionV1Hash(e9d2e7f9d7d832cbf64e6e9eb09404423757e354a1ed7420c0398d851fea3a40)).
💁  INFO : Transaction "e9d2e7f9d7d832cbf64e6e9eb09404423757e354a1ed7420c0398d851fea3a40" successfully executed.
🔗  LINK : 
💁  INFO : Call executed successfully, but no result was returned.
💁  INFO : Command executed successfully

# Verifying the name change
cargo run --bin odra_cli -- contract DogContract name

💁  INFO : Call result: Doggy
💁  INFO : Command executed successfully
```

There are more options available for the `contract` command that we can discover by running the `help` command:

```bash
cargo run --bin odra_cli -- contract DogContract rename --help

It is uncommon but you can change the dog's name.

Usage: odra_cli contract DogContract rename [OPTIONS] --new_name <String> --gas <U64>

Options:
      --new_name <String>      
      --attached_value <U512>  The amount of CSPRs attached to the call
      --gas <U64>              The amount of gas to attach to the call
  -p, --print-events           Print events emitted by the contract
  -h, --help  
```

If you want to print the events emitted by the contract, you can use the `--print-events` option. This will print all the events emitted by the contract during the call.

```bash
cargo run --bin odra_cli -- contract DogContract rename --new_name "Doggy" --gas 2500000000 --print-events

💁  INFO : Syncing events for the call...
💁  INFO : Calling "contract-package-0eda9544d667775d8e5503543dd8ba0996d439fd9ded79cfe28454d07f42df3a" directly with entrypoint "rename".
🙄  WAIT : Waiting 10 for V1(TransactionV1Hash(f2f473d46b59c136052f687539ab76e5fbb3af958c483e3a382b5a0e498227c4)).
💁  INFO : Transaction "f2f473d46b59c136052f687539ab76e5fbb3af958c483e3a382b5a0e498227c4" successfully executed.
🔗  LINK : 
💁  INFO : Captured 1 events for contract 'DogContract'
💁  INFO : Event 1: 'NamedChanged':
  'old_name': Mantus
  'new_name': Doggy

💁  INFO : Call executed successfully, but no result was returned.
💁  INFO : Command executed successfully
```

For a payable method, you can use the `--attached_value` option to specify the amount of CSPRs to attach to the call. The value is denominated in motes.

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

💁  INFO : Printing 4 the most recent events for contract 'DogContract'
💁  INFO : Event 1: 'NamedChanged':
  'old_name': Mantus
  'new_name': Doggy

💁  INFO : Event 2: 'NamedChanged':
  'old_name': Rex
  'new_name': Mantus

💁  INFO : Command executed successfully
```

By default, it prints the last 10 events, but you can specify a different number using the `-n` or `--number` option.

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

This will output:

```bash
thread 'main' panicked at examples/bin/odra_cli.rs:59:9:
assertion `left == right` failed: Dog name mismatch
  left: "Doggy"
 right: "Mantus"

## Conclusion

The Odra CLI library provides a powerful and convenient way to create command-line tools for your Odra contracts. It simplifies the process of deploying, interacting with, and testing your contracts, allowing you to focus on the business logic of your application. By following the examples in this tutorial, you can create your own CLI tools and streamline your development workflow.
```