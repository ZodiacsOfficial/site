# Supplemental read-only archive audit

The original sealed remote-modules.tar.gz contains **140 logical tar members: 139 regular files and one directory**. The regular files are 69 JavaScript payloads and 70 macOS AppleDouble metadata files. All 69 payload byte lengths and SHA256 values match delivery/remote-modules-manifest.json exactly. The extra metadata files are not additional remote JavaScript modules.

Archive SHA256: `417de927d29f6539daa85cb9221d5874698f146482892c8a42388b050a4c3ecc`. Payload-manifest SHA256: `8a45322e8552bd792517e210b7904700f4aff01df54f0fb5185f92a9111fe6d9`.

Every AppleDouble member has magic 0x00051607, version 0x00020000 and two entries: ID 9 at offset 50 (113 bytes of FinderInfo/attribute container) and ID 2 at offset 163 (empty resource fork). Its ATTR header at offset 84 describes exactly one attribute: **com.apple.provenance**, 11 bytes at offset 152. All 70 attribute values share SHA256 `3d4918f449ef140128dcdc4610061d0df7b1899f4e308c3dd9d6906d28ffdcc4`; no other xattr names were found. Each member's name, type, byte length, content hash, entry structure and attribute hash are preserved in member-manifest.json.

The audit scanned all decompressed regular-member bytes, parsed PAX-header values and the full 652,288-byte decompressed tar stream. No configured preview hostname, Vercel protection/bypass/header/cookie/secret-key pattern, JWT-shaped value, provider-token shape or bearer-authorization assignment was found. The two generic keyword hits are ordinary JavaScript: CalendarSubscribe constructs a URL using the query key `token`, and calculator-receipt rejects a URL with a `password` property. Neither hit provides an embedded credential. Exact configured patterns and offset-only results are retained in audit-result.json; candidate credential values were never emitted.

**Qualification:** this is a fresh structural/heuristic scan of archive content and metadata, not a fresh exact-secret-value scan. The original preview/protection secret values were already deleted and unavailable for comparison. The earlier raw-file scan did not cover these decompressed/xattr contents. These findings cannot prove the absence of every possible secret representation and must not be described as exact-secret validation.

The original archive was read with Python tarfile; no member was extracted to disk or executed. All 79 original delivery files were hashed before and after and remained unchanged. The original delivery manifest was neither changed nor resealed. This supplemental report and its member manifest are separate evidence.
