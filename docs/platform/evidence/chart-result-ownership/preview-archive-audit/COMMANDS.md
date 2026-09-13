# Supplemental audit commands

`python3 audit.py > audit.log 2>&1` ran from this owned supplemental scratch and exited 0. The standard-library script reads the original archive and payload manifest, enumerates logical members, decodes AppleDouble entry and ATTR structures, verifies payload hashes, scans decompressed content and PAX headers, and hashes all original delivery files before/after.

A read-only inspection initially looked for remote-modules-manifest.json under delivery/browser/ and returned file-not-found. It was located at delivery/remote-modules-manifest.json before the audit executed. A read-only inspection of the two generic matches identified ordinary URL query-key construction and URL password validation. No original file was modified, no archive member was executed, and no network call was made.
