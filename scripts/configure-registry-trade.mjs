// Registry profiles are read-only records. This compatibility hook remains in
// predev/prebuild so older deployment configuration cannot fail the build, but
// it deliberately ignores PUBLIC_REGISTRY_TRADE_ENABLED and never rewrites a
// page. The full trading interface remains confined to Terminal markets.
console.log('Registry trade panel: retired (catalogue profiles contain no purchase route or venue link)');
