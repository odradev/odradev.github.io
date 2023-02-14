---
sidebar_position: 1
---

# Cargo Odra
If you followed the [Installation](../getting-started/installation.md) tutorial properly,
you should already be set up with the Cargo Odra tool. It is an executable that will help you with
managing your smart contracts project, testing and running them on multiple backends (blockchains).

Let's take a look on all the possibilities that Cargo Odra gives you.

## Managing projects

There are two commands that will help you create a new project. The first one is `cargo odra new`.
You need to pass one parameter, namely `--name {PROJECT_NAME}`:

```bash
cargo odra new --name my-project
```

This will create a new project in the `my-project` folder and name it `my-project`. You can see it
for yourself, for example by taking a look into a `Cargo.toml` file created in your project's folder:

```toml
[package]
name = "my-project"
version = "0.1.0"
edition = "2021"
```
The project is created using existing template located in
[https://github.com/odradev/odra-template](https://github.com/odradev/odra-template).
If you want, you can use your own template, by passing `-r` parameter:

```bash
cargo odra new -r https://github.com/my-repo/my-odra-template --name my-project
```

Additionally, you can pass a branch name you want to use using `-g`, otherwise, the default
branch will be used. To see an example of a template, take a look at the repository linked above.

The second way of creating project is by using `init` command:

```bash
cargo odra init --name my-project
```

It works in the same way as `new`, but instead of creating a new folder, it will create a project
in current, empty directory.

## Generating code
If you want to quickly create a new contract code, you can use the `generate` command:

```bash
cargo odra generate -c counter 
```

This will create a new file `src/counter.rs` with sample code, add appropriate `use` and `mod` sections
to `src/lib.rs` and update the `Odra.toml` file accordingly. To learn more about `Odra.toml` file,
visit [Odra.toml](03-odra-toml.md).

## Testing
Most used command during the development of your project should be this one:

```bash
cargo odra test
```
It will run your tests against Odra's MockVM. It is substantially faster than virtual machines
provided by blockchains developers and implements all the features Odra uses.

When you want to run tests against a "real" VM, just provide the name of the backend using `-b`
option: 

```bash
cargo odra test -b casper
```

In example above, Cargo Odra will build the project, the casper builder, generate the wasm files,
spin up CasperVM instance, deploy the contracts onto it and run the tests against it. Pretty neat.
Keep in mind that this is a lot slower that MockVM and you cannot use the debugger.
This is why MockVM was created and should be your first choice when developing contracts.
Of course testing all of your code against blockchain VM is a must in the end.

If you want to run only some of the tests, you can pass arguments to the `cargo test` command
(which is run in the background obviously):

```bash
cargo odra test -- this-will-be-passed-to-cargo-test
```

If you want to run tests which names contain the word `two`, you can execute:

```bash
cargo odra test -- two
```

Of course, you can do the same when using backend:

```bash
cargo odra test -b casper -- two
```

## Building code

You can also build the code itself and generate the output contracts without running the tests.
To do so, simply run:

```bash
cargo odra build -b casper
```

Where `casper` is the name of the backend we are using in this example. If the build process
finishes successfully, wasm files will be located in `wasm` folder.

## Updating dependencies
You will learn later, that the project using Odra contains more than one Rust project - your own and
one or more builders. To run `cargo update` on all of them at once instead of traversing all the folders
you can use this command:

```bash
cargo odra update
```

## What's next
In the next section we will take a look at all the files and directories that `cargo odra` created
for us and explain their purpose.
