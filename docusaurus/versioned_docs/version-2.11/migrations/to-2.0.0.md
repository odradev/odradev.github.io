---
sidebar_position: 4
description: Migration guide to v2.0.0
---

# Migration guide to v2.0.0 from 1.*

In spite of being a major update, almost no breaking changes were introduced in the Odra v2.0.0. We tried our best to
make the upgrade as straightforward as possible. The only possible breaking change is not in the code itself, but in the
used toolchain. New version of Odra was built and tested on `nightly-2024-07-31` version.

If you are using version older than 1.4, make sure you followed previous migration guides.

## Updating rustc version

Update `rust-toolchain` file in your project:

```title="rust-toolchain"
nightly-2024-07-31
```
