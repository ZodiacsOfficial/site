# Tier B — the data-dependent tests

These need real local data and say so. There is no default path, no search
of likely locations, and no skip: a missing input is a loud failure with a
non-zero exit code, because a green run that quietly tested nothing is worse
than a red one.

```sh
PRECISION_PACK=/path/to/pack.zeph \
PRECISION_KERNEL=/path/to/de440s.bsp \
npm run test:data
```

`PRECISION_PACK` is required. Nothing here writes into the repository, and
no pack or kernel is committed.

Two files, because they need different things:

- `real-pack.nodetest.mjs` needs only a pack, and ships in the published
  archive.
- `pack-versus-kernel.nodetest.mjs` also needs `PRECISION_KERNEL` and the
  research SPK reader from the evidence tree, so it runs only from the
  repository and is not in the archive. A clean consumer has no kernel
  reader, and pretending they could run this would be the kind of green
  that means nothing.
