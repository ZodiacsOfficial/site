# `/developers/engine/` — what each claim rests on

Executed 2026-09-20. Every number on the page is reproduced below by the
command that produced it, so a reader who doubts a figure can re-run it rather
than take the page's word.

## The install block, run against the live archive

Not a stub. A throwaway `npm init -y` directory, the block exactly as the page
renders it, the real `curl` and the real `npm`:

```
Archive verified: 09c3e63432f8ba2e9df05af137c42f65ab039740a207a89418d9e6470ea3db3e
added 2 packages, and audited 3 packages in 666ms
found 0 vulnerabilities
Installed @zodiacs/engine@0.1.1-rc.6 from the verified archive.
```

`node_modules/@zodiacs/engine/package.json` then reports `0.1.1-rc.6`. The
digest matches `src/data/platform-engine-candidate.json`, which
`scripts/platform-candidate-docs.test.mjs` already pins to the bytes of
`vendor/zodiacs-engine-0.1.1-rc.6.tgz` and to the `package-lock.json`
integrity hash — so the archive GitHub serves, the archive this repository
vendors, and the archive the lockfile installs are one file.

`scripts/engine-install-block.test.mjs` executes the same block against the
real archive, a byte-flipped one, a truncated one, a failed download, a file
of that name already present, a directory of that name, a dangling symlink, a
symlink pointing at a file the user cares about, and a PATH with no `node` on
it — each of those under bash, dash and sh, because `/bin/sh` is dash on
Debian and Ubuntu and the block claims to be POSIX.

That matrix is the second version. An adversarial review broke the first one
three ways and all three passed it: wrapping the verifier in `if command -v
node`, which installs tampered bytes and exits 0 wherever node is missing;
writing the guard as `[[ -e "$FILE" || -L "$FILE" ]]`, which under dash is a
skipped guard rather than an error, so the download silently overwrites a file
the user already had and still reports success; and dropping the `test -L`
half, which lets `curl -o` follow a planted dangling symlink and write 36 KB
wherever it points. The suite could not see any of them because every case ran
under bash on a machine with node.

Seven mutations now fail it: those three, plus making the verification
non-fatal, replacing the digest comparison with an unconditional pass, moving
`npm install` ahead of the check, and adding `--insecure` to `curl` — which
the old presence-only flag assertions accepted. The block itself now refuses
to render at all from a manifest whose filename, URL, digest, name or version
would not survive being interpolated into a shell string, and it passes
`--ignore-scripts` so a verified archive still cannot run lifecycle code.

## The worked example, run in that clean consumer

The page prints a program and its output. The output was not typed by hand: it
is stdout from running the page's exact source, and it is byte-identical in the
repository and in the directory the install block had just created.

```
Sun         24.19° gemini
Moon        16.19° pisces
…
ascendant  191.24°   engine 0.1.1-rc.6
```

`scripts/engine-demo.test.mjs` runs the source and compares stdout to the text
printed beside it, so the two cannot drift apart. The instant and coordinates
are synthetic: an arbitrary date and round public coordinates for London. No
real person's birth details appear on the page or in the test.

## The bundle figures

`node scripts/measure-engine-bundle.mjs` bundles the installed package with
esbuild 0.28.1 for the browser, minified, and writes
`src/data/engine-bundle.json`, which the page reads. KB is 1024 bytes, matching
`scripts/report-bundles.mjs`.

| entry | minified | gzip | brotli |
| --- | --- | --- | --- |
| `import { natalChart }` | 57.7 KB | 24.7 KB | 20.7 KB |
| `+ @zodiacs/engine/geo` | 63.9 KB | 27.1 KB | 22.8 KB |

`--check` re-measures and fails if the committed figures move by more than
1 KB. The tolerance is deliberate: esbuild and zlib are deterministic for a
fixed input and version, but the version moves with a dependency bump, and a
gate that fails over forty bytes is a gate people learn to ignore. A real
change in what the package costs is far larger than that.

## The accuracy sentence

The page quotes the median 1.6″ and worst 18.6″ from
`docs/platform/evidence/swiss-benchmark/`, over the 160 measurements from 1801
to 2026, and says in the same breath that both programs descend from JPL
development ephemerides — so it is two implementations agreeing, not a check
against observation. It also says the engine accepts a wider date range than
was measured. `scripts/methodology-accuracy-claim.test.mjs` recomputes those
figures from `report-measure.json` for the `/methodology/` page that states
them at length.

## What the page does not claim

- Not published. `npm view @zodiacs/engine` returns 404; the page says so and
  links the support page for why, which is an open adversarial review of the
  engine and widgets packages plus the operator authority to publish.
- No independent certification, human practitioner review, or observational
  validation is claimed anywhere on it.
- Astronomy Engine is named, attributed to Don Cross, and its licence stated.
  The page says in as many words that Zodiacs did not write those models.

## Related corrections in the same change

`public/llms-full.txt` carried the same false release-state claim that
`/developers/support/` did before it was corrected — that publication was
authorized and only an authenticated publish remained. The candidate's own
README ("remains held for review and operator [authority]") and CHANGELOG
("SDK #5's explicit merge/publication hold and required review remain") say
otherwise, and the file now matches them.
