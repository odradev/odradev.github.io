---
sidebar_position: 1
description: A tool for managing Odra projects
---

# Cargo Odra
If you followed the [Installation](../getting-started/installation.md) tutorial properly,
you should already be set up with the Cargo Odra tool. It is an executable that will help you with
managing your smart contracts project, testing and running them with various configurations.

Let's take a look at all the possibilities that Cargo Odra gives you.

## Managing projects

Two commands help you create a new project. The first one is `cargo odra new`.
You need to pass one parameter, namely `--name {PROJECT_NAME}`:

```bash
cargo odra new --name my-project
```

This creates a new project in the `my_project` folder and name it `my_project`. You can see it
for yourself, for example by taking a look into a `Cargo.toml` file created in your project's folder:

```toml
[package]
name = "my_project"
version = "0.1.0"
edition = "2021"
```
The project is created using the template located in [Odra's main repository](https://github.com/odradev/odra).
By default it uses `full` template, if you want, you can use minimalistic `blank` by running:

```bash
cargo odra new -t blank --name my-project
```

The third available template is `workspace`, which creates a workspace with two projects, similar to the one created 
with the `full` template.

By default, the latest release of Odra will be used for the template and as a dependency.
You can pass a source of Odra you want to use, by using `-s` parameter:

```bash
cargo odra new -n my-project -s ../odra # will use local folder of odra
cargo odra new -n my-project -s release/0.9.0 # will use github branch, e.g. if you want to test new release
cargo odra new -n my-project -s 1.0.0 # will use a version released on crates.io
```

The second way of creating a project is by using `init` command:

```bash
cargo odra init --name my-project
```

It works in the same way as `new`, but instead of creating a new folder, it creates a project
in the current, empty directory.

## Generating code
If you want to quickly create a new contract code, you can use the `generate` command:

```bash
cargo odra generate -c counter 
```

This creates a new file `src/counter.rs` with sample code, add appropriate `use` and `mod` sections
to `src/lib.rs` and update the `Odra.toml` file accordingly. To learn more about `Odra.toml` file,
visit [Odra.toml](03-odra-toml.md).

## Testing
The most used command during the development of your project should be this one:

```bash
cargo odra test
```
It runs your tests against Odra's `MockVM`. It is substantially faster than `CasperVM`
and implements all the features Odra uses.

When you want to run tests against a "real" VM, just provide the name of the backend using `-b`
option:

```bash
cargo odra test -b casper
```

In the example above, Cargo Odra builds the project, generates the wasm files,
spin up `CasperVM` instance, deploys the contracts onto it and runs the tests against it. Pretty neat.

Keep in mind that this is a lot slower than `OdraVM` and you cannot use the debugger.
This is why `OdraVM` was created and should be your first choice when developing contracts.
Of course, testing all of your code against a blockchain VM is a must in the end.

If you want to run only some of the tests, you can pass arguments to the `cargo test` command
(which is run in the background obviously):

```bash
cargo odra test -- this-will-be-passed-to-cargo-test
```

If you want to run tests which names contain the word `two`, you can execute:

```bash
cargo odra test -- two
```

Of course, you can do the same when using the backend:

```bash
cargo odra test -b casper -- two
```

## Building code

You can also build the code itself and generate the output contracts without running the tests.
To do so, simply run:

```bash
cargo odra build
```

If the build process finishes successfully, wasm files will be located in `wasm` folder.
Notice, that this command does not require the `-b` option.

If you want to build specific contract, you can use `-c` option:

```bash
cargo odra build -c counter # you pass many comma separated contracts
```

## Generating contract schema

If you want to generate a schema (including the name, entrypoints, events, etc.) for your contract, you can use the `schema` command:

```bash
cargo odra schema 
```

This generates a schema file in JSON format for all your contracts and places them in the `resources` folder. 
If the `resources` folder does not exist, it creates the folder for you.

Like with the `build` command, you can use the `-c` option to generate a schema for a specific contract.

## What's next
In the next section, we will take a look at all the files and directories that `cargo odra` created
for us and explain their purpose.
