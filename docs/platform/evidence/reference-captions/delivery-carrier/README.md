# Isolated C016 delivery carrier

The shared checkout remains at its original local branch/HEAD831bc9e with accepted
uncommitted C016 files. Read-only Git object access stalls against a packed index
observed by root as compressed/dataless with zero allocated blocks. Root stops
only its three identified read-only checks. Shared metadata, cloud settings,
other processes and concurrent work are untouched.

A fresh shallow partial clone starts at exact remote C015 source
9d180c9f1a2f66893ccd6d73fcda106cb3894674. It has no initial checkout; its index is
initialized from HEAD. Root copies all baseline tracked paths from the current
filesystem, all frozen new tests and current docs/platform records. Existing
tracked skill symlinks are preserved as links, not dereferenced. An initial
copy deliberately rejected the first symlink; the completed copy handles those
explicitly. It transfers13,107 paths/702,246,522 content/link bytes, with all
copied bytes checked. The compressed ordinary JSON record reproduces that exact
copy snapshot. Subsequent delivery records are additions to that snapshot.

All33 frozen product/test files and all51 final acceptance source records match
before staging. The initial actual staged diff has714 paths: exactly36 accepted
non-documentation files and678 documentation paths. Documentation is limited to
docs/platform plus the fresh approved-capture source manifest. Git whitespace
checks pass in the healthy clone. This equivalent carrier includes the final
content of the original local documentation commits above9d18, but preserves
those commits/branch in the shared repository rather than rewriting them.

The actual isolated draft head, final path/blob reconciliation, CI and preview
are recorded after commit. No repeated product acceptance is inferred from this
copy; source identities bind the prior accepted build and browser evidence.
