# Memory allocators

When compiling contracts to wasm, your code needs to be `no-std`.
This means that instead of using the standard library, the `core`
crate will be linked to your code. This crate does not contain
a memory allocator.

Happily, Odra automatically enables allocator - from our tests 
the one developed by [ink!](https://docs.rs/ink_allocator/latest/ink_allocator/)
seems to be the best.

## Using a different allocator

If the default allocator does not suit your needs, or you use a crate that
already provides an allocator, you can disable the default allocator by enabling
the `disable-allocator` feature in the `odra` dependency in your project:

```toml
[dependencies]
odra = { path = "../odra", features = ["disable-allocator"] }
```

If you want to have a better control over the features that are enabled
during the building and tests, see the next article on [building manually](06-building-manually.md).