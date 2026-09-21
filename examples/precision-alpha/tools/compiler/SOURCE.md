# Where this compiler came from

A verbatim copy of the pack compiler from the research tree, vendored so a
consumer of this package has a tested route from their own kernel to a
local pack without needing the website checkout.

Source: `docs/platform/evidence/precision-2026-09-20/compiler/` in
ZodiacsOfficial/site at `2f07212bfb6fbe07c4b55f8583c460acd50e1b63`.

| file | sha256 |
| --- | --- |
| `compile.mjs` | `a5cb5f13ab6b3cb593e12d1590794f72dd12893d8500162d96a365fb4b1bc472` |
| `cheb.mjs` | `e3d1793ad9db89df925d7e14493420bdb4cda0f3d29645c9c13577e2f47fbb65` |
| `format.mjs` | `7f509db1f0d69448c26894936c066c6f9a10fbc3f78d68a209f123ab799782db` |
| `sources.mjs` | `4fbf3098d970b3ddfb5f8d0acf92b6d3fe4e2979cb9073fe00673261dab18d68` |
| `spkref.mjs` | `eda035a677c9f3898c4039c3156202ce6f812b394d1c89fd5d401b448c307c68` |
| `runtime.mjs` | `3d7f7aca14153e9ac15cbda239ef12ed695fbef5c19877d8e71f8b9d19bc987d` |

`runtime.mjs` (sha256 `3d7f7aca14153e9ac15cbda239ef12ed695fbef5c19877d8e71f8b9d19bc987d`) is vendored too, and is the one file here
that nothing imports. The compiler stamps a hash of its own source set into
every pack header and `runtime.mjs` is in that set, so the file has to be
present for the hash to be computable; it is the research track's own
reader and **this package does not use it**. The numerical core is
`src/core/`, and a test asserts nothing under `src/` reaches into this
directory.

It also needs one data file, `raw/choice.json` (sha256 `bd433a11cb062e46cf00ca7c1fa63383c28deba0f15956597d47a159c8c99d14`),
which is the per-body interval and degree choice the sweep settled on. It
contains settings and fitted error figures, no coefficients and nothing
derived from a kernel.

`test/tier-a/vendored-compiler.nodetest.mjs` re-hashes these and, when the
research tree is present beside them, checks the copy has not drifted from
it. In a packed archive the research tree is absent and the hash table above
is what remains checkable.

It reads a SPICE SPK kernel and writes a `ZODEPH01` pack;
`tools/seal.mjs` converts that to the `ZODEPH02` this runtime accepts.
No coefficient data is included here — only the program that produces it
from a kernel you supply.
