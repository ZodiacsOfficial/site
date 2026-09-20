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

`PRECISION_KERNEL` is optional for some of these; `PRECISION_PACK` is not.
Each test says which it needs. Nothing here writes into the repository, and
no pack or kernel is committed.
