---
sidebar_position: 1
---

# Directory structure

Docusaurus creates a **page for each blog post**, but also a **blog index page**, a **tag system**, an **RSS** feed...

## Let's flip a flipper

```rust title="Flipper.rs"
use async_trait::async_trait;
use cucumber::{given, then, when, World, WorldInit};
use {{project-name}}::flipper::{Flipper, FlipperRef};
use std::convert::Infallible;
use std::fmt::Debug;

#[derive(WorldInit)]
pub struct FlipperWorld {
    flipper: Option<FlipperRef>,
}

impl Debug for FlipperWorld {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "FlipperWorld")
    }
}

#[async_trait(?Send)]
impl World for FlipperWorld {
    type Error = Infallible;
    async fn new() -> Result<Self, Infallible> {
        Ok(Self {
            flipper: Some(Flipper::deploy()),
        })
    }
}

#[given(expr = "Flipper contract")]
fn erc20_token_is_deployed(world: &mut FlipperWorld) {
    world.flipper = Some(Flipper::deploy());
}

#[when(expr = "I flip it")]
fn i_transfer_amount_symbol_to_address(world: &mut FlipperWorld) {
    let flipper = world.flipper.as_ref().unwrap();
    flipper.flip();
}

#[then(expr = "Its value is true")]
fn its_value_is_true(world: &mut FlipperWorld) {
    let flipper = world.flipper.as_ref().unwrap();
    assert!(flipper.get());
}

#[then(expr = "Its value is false")]
fn its_value_is_false(world: &mut FlipperWorld) {
    let flipper = world.flipper.as_ref().unwrap();
    assert!(!flipper.get());
}

fn main() {
    futures::executor::block_on(FlipperWorld::run("tests/features/contracts"));
}
```