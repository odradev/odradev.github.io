# Odra CLI
The Odra CLI library allows creating cli clients for your contracts. Instead of using `casper-client` with 
complex incantations, you can use the Odra CLI library to create a client that will be able to call your contract methods
directly, by name, and with the correct arguments.

## Deploy script
Let's go through an example available in the odra repository to see how to use the Odra CLI library.
It creates a cli tool for a useful "DogContract".

To use the Odra CLI library in your project, you need to add `odra-cli` `Cargo.toml` file, alongside a new binary:

```toml
[dependencies]
...
odra-cli = "2"
...

[[bin]]
name = "odra-cli"
path = "src/bin/odra-cli.rs"
```

Then, create a new file in the `src/bin` directory named `odra-cli.rs`:

```rust
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

        Ok(())
    }
}

/// Main function to run the CLI tool.
pub fn main() {
    OdraCli::new()
        .about("Dog contract cli tool")
        .deploy(DeployDogScript)
        .contract::<DogContract>()
        .build()
        .run();
}
```

In the example above, we see an implementation of a simple DeployScript for our DogContract. It sets the gas limit,
deploys the contract and adds it to a container. The main function creates a new OdraCli instance, and sets the deploy script,
making it available for the user.

## How to use it
Assuming the correct [livenet](/backends/livenet) environment is set up, you can run the cli tool using the following command:

```bash
cargo run --bin odra_cli
```

Which will display all of our options:

```bash
Dog contract cli tool

Usage: odra_cli <COMMAND>

Commands:
  deploy    Runs the deploy script
  contract  Commands for interacting with contracts
  scenario  Commands for running user-defined scenarios
  help      Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

First, we need to deploy the contract:

```bash
cargo run --bin odra_cli deploy
```

Which gives us an output:
```bash
cargo run --bin odra_cli -- deploy
   Compiling odra-examples v2.0.0 (/home/kuba/Projekty/odra/odra/examples)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.65s
     Running `../target/debug/odra_cli deploy`
💁  INFO : Found wasm under "wasm/DogContract.wasm".
💁  INFO : Deploying "DogContract".
🙄  WAIT : Waiting 10 for V1(TransactionV1Hash(10ce0134ac3a67772a668bb6c32a0dc74c09278f44d7896cc5419b8e2b2de33e)).                                                                                          
💁  INFO : Deploy "10ce0134ac3a67772a668bb6c32a0dc74c09278f44d7896cc5419b8e2b2de33e" successfully executed.                                                                                                 
💁  INFO : Contract "contract-package-3e1e053c2e9377e823d9156e0663b7614f74eb524d47d9dc4a621f8cd06a357b" deployed.                                                                                           
💁  INFO : Command executed successfully
```

This will run the deploy script, and create a new file in the `resources` directory named `deployed-contracts.toml`:

```toml
time = "2025-05-22T14:40:31Z"

[[contracts]]
name = "DogContract"
package_hash = "hash-3e1e053c2e9377e823d9156e0663b7614f74eb524d47d9dc4a621f8cd06a357b"
```

All the calls to the contract will be made using this package hash.

## Calling contract methods

To call a contract method, we need to use the `contract` command. The command itself will display all the available contracts:

```bash
cargo run --bin odra_cli -- contract
```
Which outputs:
```bash
Commands for interacting with contracts

Usage: odra_cli contract <COMMAND>

Commands:
  DogContract  Commands for interacting with the DogContract contract
  help         Print this message or the help of the given subcommand(s)
```

And when contract is selected, it will show us the available methods:

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
It will result with:
```bash
💁  INFO : true
💁  INFO : Command executed successfully
```

## Creating and running a scenario

Sometimes we want to run multiple calls one after another. To simplify this, we can create a scenario.
To do this implement the `Scenario` trait in the `odra-cli` binary:

```rust

/// Checks if the name of the deployed dog matches the provided name.
pub struct DogCheckScenario;

impl Scenario for DogCheckScenario {
    fn args(&self) -> Vec<CommandArg> {
        vec![CommandArg::new(
            "name",
            "The name of the dog",
            NamedCLType::String,
            false,
            false
        )]
    }

    fn run(
        &self,
        env: &HostEnv,
        container: DeployedContractsContainer,
        args: ScenarioArgs
    ) -> Result<(), ScenarioError> {
        let dog_contract = container.get_ref::<DogContract>(env)?;
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

The example above performs a simple check on the return value of one of the methods. 
Of course, there is no limit to how complex a scenario can be.

Remember to add the scenario in the main function:

```rust
/// Main function to run the CLI tool.
pub fn main() {
    OdraCli::new()
        .about("Dog contract cli tool")
        .deploy(DeployDogScript)
        .contract::<DogContract>()
        .scenario::<DogCheckScenario>(DogCheckScenario) // New scenario
        .build()
        .run();
}
```

It will appear in the scenario command:

```bash
cargo run --bin odra_cli -- scenario
```
Will output:
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
```