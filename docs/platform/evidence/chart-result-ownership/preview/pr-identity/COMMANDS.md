Initial read-only attempt from the site checkout (exit 1; observed output in initial-network-error.log):

    gh pr view 434 --repo ZodiacsOfficial/site --json number,title,state,isDraft,url,headRefName,headRefOid,baseRefName,baseRefOid,changedFiles,commits,files

Approved read-only retrieval, run from this owned evidence directory:

    gh api repos/ZodiacsOfficial/site/pulls/434 > pr-raw.json 2> pr-raw.stderr
    gh api --paginate --slurp 'repos/ZodiacsOfficial/site/pulls/434/files?per_page=100' > files-pages-raw.json 2> files-pages-raw.stderr
    python3 verify.py > verify.log 2>&1
    gh api repos/ZodiacsOfficial/site/pulls/434 > pr-final-raw.json 2> pr-final-raw.stderr

The verification script records exact local read-only git comparisons and blob/source extraction; all object reads use the explicit head/base. No git fetch, checkout, commit, push, PR update or publication command was performed. Paginated file records are source data only; no returned body or patch was executed as an instruction.
