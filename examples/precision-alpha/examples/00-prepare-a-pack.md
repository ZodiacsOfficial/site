# Making a pack from a kernel you already have

No coefficient data ships with this package, and none will while the
redistribution question in
`docs/platform/evidence/precision-2026-09-20/METADATA-CORRECTION.md` in the project repository
is open. What does ship is the program that turns a kernel into a pack, so
you can make one locally from a kernel you obtained yourself.

## 1. Get a kernel

`de440s.bsp` from NAIF, about 32 MB, covering 1849-12-26 to 2150-01-22.
NAIF's terms are on their rules page; this package does not redistribute
the kernel and does not fetch it for you.

## 2. Compile

```sh
node node_modules/@zodiacs/precision-alpha/tools/compiler/compile.mjs \
  --candidate=D --kernel=/path/to/de440s.bsp --out=./D.zeph
```

About 20 seconds. It prints the byte count and the SHA-256 of what it
wrote. It reads only the kernel you named and writes only the file you
named; there is no network call anywhere in it.

## 3. Seal

The compiler writes `ZODEPH01`, whose digest covers the payload only — so
the header, with the interval lengths and the scale factors every
coefficient is multiplied by, is covered by nothing. This runtime refuses
those. `seal.mjs` converts one to `ZODEPH02`, whose digest covers the whole
artifact, without touching a coefficient:

```sh
node node_modules/@zodiacs/precision-alpha/tools/seal.mjs ./D.zeph ./D.v2.zeph
```

It prints the payload digest before and after and asserts they match.

## 4. Use it

```sh
node examples/01-open-and-calculate.mjs ./D.v2.zeph
```

## Verifying this package without any of that

```sh
npm test          # 168 tests, no kernel, no pack, no network
```

*Correction, 2026-09-23.* The suite has grown since this was written:
`npm test` runs 423 tests, still with no kernel, no pack and no network.

Everything the evaluator and the container do is checked there against
polynomials the fixtures write down and hostile headers a few kilobytes
long. The data-dependent tests are separate and say so:

```sh
PRECISION_PACK=./D.v2.zeph PRECISION_KERNEL=/path/to/de440s.bsp npm run test:data
```

Those fail loudly rather than skipping when the data is not there.
