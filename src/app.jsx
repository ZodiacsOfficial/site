    const { useState, useMemo, useEffect, useRef, useCallback } = React;

    function trackAnalytics(name, properties = {}) {
      window.zodiacsAnalytics?.track?.(name, properties);
    }

    // IntersectionObserver-driven scroll reveal — no static mount.
    // Returns a ref-callback that adds `is-in` once the element enters.
    // Fires as a section approaches (small threshold, forward margin) so
    // the page never presents a viewport of unrevealed black on the way down.
    function useReveal(threshold = 0.05) {
      return useCallback((el) => {
        if (!el) return;
        const io = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) {
            el.classList.add('is-in');
            io.disconnect();
          }
        }, { threshold, rootMargin: '0px 0px 12% 0px' });
        io.observe(el);
      }, [threshold]);
    }

    // ──────────────────────────────────────────────────────────────
    // Canonical registry data. This mirrors /registry/zodiacs.registry.json
    // and the @zodiacs/sdk registry schema: one sign identity, one native
    // Solana SPL representation, and one official bridged Base ERC-20
    // representation. The UI derives its display model from this object
    // instead of maintaining a second address shape.
    // ──────────────────────────────────────────────────────────────
    const ZODIACS_REGISTRY = {
          "name": "Zodiacs Official Registry",
          "source": "https://zodiacs.org",
          "sdk": "@zodiacs/sdk",
          "version": "0.2.0",
          "nativeChain": "solana",
          "supportedChains": [
                {
                      "chain": "solana",
                      "kind": "native",
                      "tokenStandard": "SPL"
                },
                {
                      "chain": "base",
                      "chainId": 8453,
                      "kind": "bridged",
                      "tokenStandard": "ERC20"
                }
          ],
          "assets": [
                {
                      "sign": "aries",
                      "displayName": "Aries",
                      "metadata": {
                            "element": "fire",
                            "modality": "cardinal",
                            "rulingPlanet": "Mars",
                            "archetype": "The Initiator",
                            "dateRange": "03-21 to 04-19",
                            "shortBio": "A cultural asset for symbolic identity expressed through origin, force, and first movement."
                      },
                      "native": {
                            "sign": "aries",
                            "chain": "solana",
                            "kind": "native",
                            "tokenStandard": "SPL",
                            "address": "GhFiFrExPY3proVF96oth1gESWA5QPQzdtb8cy8b1YZv",
                            "decimals": 6,
                            "symbol": "ARIES",
                            "name": "Aries",
                            "isCanonicalOrigin": true,
                            "isOfficialRepresentation": true
                      },
                      "representations": [
                            {
                                  "sign": "aries",
                                  "chain": "solana",
                                  "kind": "native",
                                  "tokenStandard": "SPL",
                                  "address": "GhFiFrExPY3proVF96oth1gESWA5QPQzdtb8cy8b1YZv",
                                  "decimals": 6,
                                  "symbol": "ARIES",
                                  "name": "Aries",
                                  "isCanonicalOrigin": true,
                                  "isOfficialRepresentation": true
                            },
                            {
                                  "sign": "aries",
                                  "chain": "base",
                                  "chainId": 8453,
                                  "kind": "bridged",
                                  "tokenStandard": "ERC20",
                                  "address": "0x3ffB5282F5891Dd8c813E64059EdB0607537eC91",
                                  "decimals": 6,
                                  "symbol": "ARIES",
                                  "name": "Aries",
                                  "isCanonicalOrigin": false,
                                  "isOfficialRepresentation": true,
                                  "originChain": "solana",
                                  "originAddress": "GhFiFrExPY3proVF96oth1gESWA5QPQzdtb8cy8b1YZv",
                                  "bridge": {
                                        "status": "official-bridged",
                                        "protocol": "wormhole",
                                        "sourceChain": "solana",
                                        "destinationChain": "base",
                                        "notes": "Official bridged Base representation deployed through Wormhole BridgeToken contracts."
                                  }
                            }
                      ]
                },
                {
                      "sign": "taurus",
                      "displayName": "Taurus",
                      "metadata": {
                            "element": "earth",
                            "modality": "fixed",
                            "rulingPlanet": "Venus",
                            "archetype": "The Steward",
                            "dateRange": "04-20 to 05-20",
                            "shortBio": "A cultural asset for ownership, form, value, and symbolic endurance."
                      },
                      "native": {
                            "sign": "taurus",
                            "chain": "solana",
                            "kind": "native",
                            "tokenStandard": "SPL",
                            "address": "EjkkxYpfSwS6TAtKKuiJuNMMngYvumc1t1v9ZX1WJKMp",
                            "decimals": 6,
                            "symbol": "TAURUS",
                            "name": "Taurus",
                            "isCanonicalOrigin": true,
                            "isOfficialRepresentation": true
                      },
                      "representations": [
                            {
                                  "sign": "taurus",
                                  "chain": "solana",
                                  "kind": "native",
                                  "tokenStandard": "SPL",
                                  "address": "EjkkxYpfSwS6TAtKKuiJuNMMngYvumc1t1v9ZX1WJKMp",
                                  "decimals": 6,
                                  "symbol": "TAURUS",
                                  "name": "Taurus",
                                  "isCanonicalOrigin": true,
                                  "isOfficialRepresentation": true
                            },
                            {
                                  "sign": "taurus",
                                  "chain": "base",
                                  "chainId": 8453,
                                  "kind": "bridged",
                                  "tokenStandard": "ERC20",
                                  "address": "0xd5356c6E529569c6912978433DAfb7ca72B5f09C",
                                  "decimals": 6,
                                  "symbol": "TAURUS",
                                  "name": "Taurus",
                                  "isCanonicalOrigin": false,
                                  "isOfficialRepresentation": true,
                                  "originChain": "solana",
                                  "originAddress": "EjkkxYpfSwS6TAtKKuiJuNMMngYvumc1t1v9ZX1WJKMp",
                                  "bridge": {
                                        "status": "official-bridged",
                                        "protocol": "wormhole",
                                        "sourceChain": "solana",
                                        "destinationChain": "base",
                                        "notes": "Official bridged Base representation deployed through Wormhole BridgeToken contracts."
                                  }
                            }
                      ]
                },
                {
                      "sign": "gemini",
                      "displayName": "Gemini",
                      "metadata": {
                            "element": "air",
                            "modality": "mutable",
                            "rulingPlanet": "Mercury",
                            "archetype": "The Messenger",
                            "dateRange": "05-21 to 06-20",
                            "shortBio": "A cultural asset for symbolic identity shaped by language, duality, and exchange."
                      },
                      "native": {
                            "sign": "gemini",
                            "chain": "solana",
                            "kind": "native",
                            "tokenStandard": "SPL",
                            "address": "ARiZfq6dK19uNqxWyRudhbM2MswLyYhVUHdndGkffdGc",
                            "decimals": 6,
                            "symbol": "GEMINI",
                            "name": "Gemini",
                            "isCanonicalOrigin": true,
                            "isOfficialRepresentation": true
                      },
                      "representations": [
                            {
                                  "sign": "gemini",
                                  "chain": "solana",
                                  "kind": "native",
                                  "tokenStandard": "SPL",
                                  "address": "ARiZfq6dK19uNqxWyRudhbM2MswLyYhVUHdndGkffdGc",
                                  "decimals": 6,
                                  "symbol": "GEMINI",
                                  "name": "Gemini",
                                  "isCanonicalOrigin": true,
                                  "isOfficialRepresentation": true
                            },
                            {
                                  "sign": "gemini",
                                  "chain": "base",
                                  "chainId": 8453,
                                  "kind": "bridged",
                                  "tokenStandard": "ERC20",
                                  "address": "0x8F6eb25aB4CD2F8f064f7da5E35136D4EC600b4f",
                                  "decimals": 6,
                                  "symbol": "GEMINI",
                                  "name": "Gemini",
                                  "isCanonicalOrigin": false,
                                  "isOfficialRepresentation": true,
                                  "originChain": "solana",
                                  "originAddress": "ARiZfq6dK19uNqxWyRudhbM2MswLyYhVUHdndGkffdGc",
                                  "bridge": {
                                        "status": "official-bridged",
                                        "protocol": "wormhole",
                                        "sourceChain": "solana",
                                        "destinationChain": "base",
                                        "notes": "Official bridged Base representation deployed through Wormhole BridgeToken contracts."
                                  }
                            }
                      ]
                },
                {
                      "sign": "cancer",
                      "displayName": "Cancer",
                      "metadata": {
                            "element": "water",
                            "modality": "cardinal",
                            "rulingPlanet": "Luna",
                            "archetype": "The Keeper",
                            "dateRange": "06-21 to 07-22",
                            "shortBio": "A cultural asset for memory, protection, belonging, and ancestral continuity."
                      },
                      "native": {
                            "sign": "cancer",
                            "chain": "solana",
                            "kind": "native",
                            "tokenStandard": "SPL",
                            "address": "CmomKM8iPKRSMN7y1jqyW1QKj5bGoZmbvNZXWBJSUdnZ",
                            "decimals": 6,
                            "symbol": "CANCER",
                            "name": "Cancer",
                            "isCanonicalOrigin": true,
                            "isOfficialRepresentation": true
                      },
                      "representations": [
                            {
                                  "sign": "cancer",
                                  "chain": "solana",
                                  "kind": "native",
                                  "tokenStandard": "SPL",
                                  "address": "CmomKM8iPKRSMN7y1jqyW1QKj5bGoZmbvNZXWBJSUdnZ",
                                  "decimals": 6,
                                  "symbol": "CANCER",
                                  "name": "Cancer",
                                  "isCanonicalOrigin": true,
                                  "isOfficialRepresentation": true
                            },
                            {
                                  "sign": "cancer",
                                  "chain": "base",
                                  "chainId": 8453,
                                  "kind": "bridged",
                                  "tokenStandard": "ERC20",
                                  "address": "0xb9Fd3c3157C7b69260Ca285FbbC74F6309226378",
                                  "decimals": 6,
                                  "symbol": "CANCER",
                                  "name": "Cancer",
                                  "isCanonicalOrigin": false,
                                  "isOfficialRepresentation": true,
                                  "originChain": "solana",
                                  "originAddress": "CmomKM8iPKRSMN7y1jqyW1QKj5bGoZmbvNZXWBJSUdnZ",
                                  "bridge": {
                                        "status": "official-bridged",
                                        "protocol": "wormhole",
                                        "sourceChain": "solana",
                                        "destinationChain": "base",
                                        "notes": "Official bridged Base representation deployed through Wormhole BridgeToken contracts."
                                  }
                            }
                      ]
                },
                {
                      "sign": "leo",
                      "displayName": "Leo",
                      "metadata": {
                            "element": "fire",
                            "modality": "fixed",
                            "rulingPlanet": "Sun",
                            "archetype": "The Sovereign",
                            "dateRange": "07-23 to 08-22",
                            "shortBio": "A cultural asset for presence, authorship, radiance, and recognition."
                      },
                      "native": {
                            "sign": "leo",
                            "chain": "solana",
                            "kind": "native",
                            "tokenStandard": "SPL",
                            "address": "8Cd7wXoPb5Yt9cUGtmHNqAEmpMDrhfcVqnGbLC48b8Qm",
                            "decimals": 6,
                            "symbol": "LEO",
                            "name": "Leo",
                            "isCanonicalOrigin": true,
                            "isOfficialRepresentation": true
                      },
                      "representations": [
                            {
                                  "sign": "leo",
                                  "chain": "solana",
                                  "kind": "native",
                                  "tokenStandard": "SPL",
                                  "address": "8Cd7wXoPb5Yt9cUGtmHNqAEmpMDrhfcVqnGbLC48b8Qm",
                                  "decimals": 6,
                                  "symbol": "LEO",
                                  "name": "Leo",
                                  "isCanonicalOrigin": true,
                                  "isOfficialRepresentation": true
                            },
                            {
                                  "sign": "leo",
                                  "chain": "base",
                                  "chainId": 8453,
                                  "kind": "bridged",
                                  "tokenStandard": "ERC20",
                                  "address": "0x4f7B4c12DE5d47314C86Ed3BA25E289aA139CF75",
                                  "decimals": 6,
                                  "symbol": "LEO",
                                  "name": "Leo",
                                  "isCanonicalOrigin": false,
                                  "isOfficialRepresentation": true,
                                  "originChain": "solana",
                                  "originAddress": "8Cd7wXoPb5Yt9cUGtmHNqAEmpMDrhfcVqnGbLC48b8Qm",
                                  "bridge": {
                                        "status": "official-bridged",
                                        "protocol": "wormhole",
                                        "sourceChain": "solana",
                                        "destinationChain": "base",
                                        "notes": "Official bridged Base representation deployed through Wormhole BridgeToken contracts."
                                  }
                            }
                      ]
                },
                {
                      "sign": "virgo",
                      "displayName": "Virgo",
                      "metadata": {
                            "element": "earth",
                            "modality": "mutable",
                            "rulingPlanet": "Mercury",
                            "archetype": "The Archivist",
                            "dateRange": "08-23 to 09-22",
                            "shortBio": "A cultural asset for craft, discernment, service, and exacting order."
                      },
                      "native": {
                            "sign": "virgo",
                            "chain": "solana",
                            "kind": "native",
                            "tokenStandard": "SPL",
                            "address": "Ez4bst5qu5uqX3AntYWUdafw9XvtFeJ3gugytKKbSJso",
                            "decimals": 6,
                            "symbol": "VIRGO",
                            "name": "Virgo",
                            "isCanonicalOrigin": true,
                            "isOfficialRepresentation": true
                      },
                      "representations": [
                            {
                                  "sign": "virgo",
                                  "chain": "solana",
                                  "kind": "native",
                                  "tokenStandard": "SPL",
                                  "address": "Ez4bst5qu5uqX3AntYWUdafw9XvtFeJ3gugytKKbSJso",
                                  "decimals": 6,
                                  "symbol": "VIRGO",
                                  "name": "Virgo",
                                  "isCanonicalOrigin": true,
                                  "isOfficialRepresentation": true
                            },
                            {
                                  "sign": "virgo",
                                  "chain": "base",
                                  "chainId": 8453,
                                  "kind": "bridged",
                                  "tokenStandard": "ERC20",
                                  "address": "0xAcFd97106bbE5D931aC430Be76A8E362832D48f4",
                                  "decimals": 6,
                                  "symbol": "VIRGO",
                                  "name": "Virgo",
                                  "isCanonicalOrigin": false,
                                  "isOfficialRepresentation": true,
                                  "originChain": "solana",
                                  "originAddress": "Ez4bst5qu5uqX3AntYWUdafw9XvtFeJ3gugytKKbSJso",
                                  "bridge": {
                                        "status": "official-bridged",
                                        "protocol": "wormhole",
                                        "sourceChain": "solana",
                                        "destinationChain": "base",
                                        "notes": "Official bridged Base representation deployed through Wormhole BridgeToken contracts."
                                  }
                            }
                      ]
                },
                {
                      "sign": "libra",
                      "displayName": "Libra",
                      "metadata": {
                            "element": "air",
                            "modality": "cardinal",
                            "rulingPlanet": "Venus",
                            "archetype": "The Arbiter",
                            "dateRange": "09-23 to 10-22",
                            "shortBio": "A cultural asset for relation, judgment, proportion, and civic balance."
                      },
                      "native": {
                            "sign": "libra",
                            "chain": "solana",
                            "kind": "native",
                            "tokenStandard": "SPL",
                            "address": "7Zt2KUh5mkpEpPGcNcFy51aGkh9Ycb5ELcqRH1n2GmAe",
                            "decimals": 6,
                            "symbol": "LIBRA",
                            "name": "Libra",
                            "isCanonicalOrigin": true,
                            "isOfficialRepresentation": true
                      },
                      "representations": [
                            {
                                  "sign": "libra",
                                  "chain": "solana",
                                  "kind": "native",
                                  "tokenStandard": "SPL",
                                  "address": "7Zt2KUh5mkpEpPGcNcFy51aGkh9Ycb5ELcqRH1n2GmAe",
                                  "decimals": 6,
                                  "symbol": "LIBRA",
                                  "name": "Libra",
                                  "isCanonicalOrigin": true,
                                  "isOfficialRepresentation": true
                            },
                            {
                                  "sign": "libra",
                                  "chain": "base",
                                  "chainId": 8453,
                                  "kind": "bridged",
                                  "tokenStandard": "ERC20",
                                  "address": "0x4201eff5F419CD6EEDFb28fa240edeaFc9002204",
                                  "decimals": 6,
                                  "symbol": "LIBRA",
                                  "name": "Libra",
                                  "isCanonicalOrigin": false,
                                  "isOfficialRepresentation": true,
                                  "originChain": "solana",
                                  "originAddress": "7Zt2KUh5mkpEpPGcNcFy51aGkh9Ycb5ELcqRH1n2GmAe",
                                  "bridge": {
                                        "status": "official-bridged",
                                        "protocol": "wormhole",
                                        "sourceChain": "solana",
                                        "destinationChain": "base",
                                        "notes": "Official bridged Base representation deployed through Wormhole BridgeToken contracts."
                                  }
                            }
                      ]
                },
                {
                      "sign": "scorpio",
                      "displayName": "Scorpio",
                      "metadata": {
                            "element": "water",
                            "modality": "fixed",
                            "rulingPlanet": "Mars",
                            "archetype": "The Custodian",
                            "dateRange": "10-23 to 11-21",
                            "shortBio": "A cultural asset for depth, transformation, secrecy, and resolve."
                      },
                      "native": {
                            "sign": "scorpio",
                            "chain": "solana",
                            "kind": "native",
                            "tokenStandard": "SPL",
                            "address": "J4fQTRN13MKpXhVE74t99msKJLbrjegjEgLBnzEv2YH1",
                            "decimals": 6,
                            "symbol": "SCORPIO",
                            "name": "Scorpio",
                            "isCanonicalOrigin": true,
                            "isOfficialRepresentation": true
                      },
                      "representations": [
                            {
                                  "sign": "scorpio",
                                  "chain": "solana",
                                  "kind": "native",
                                  "tokenStandard": "SPL",
                                  "address": "J4fQTRN13MKpXhVE74t99msKJLbrjegjEgLBnzEv2YH1",
                                  "decimals": 6,
                                  "symbol": "SCORPIO",
                                  "name": "Scorpio",
                                  "isCanonicalOrigin": true,
                                  "isOfficialRepresentation": true
                            },
                            {
                                  "sign": "scorpio",
                                  "chain": "base",
                                  "chainId": 8453,
                                  "kind": "bridged",
                                  "tokenStandard": "ERC20",
                                  "address": "0x0057C9cB6D16C2ecA808788f14d0d0c367b26676",
                                  "decimals": 6,
                                  "symbol": "SCORPIO",
                                  "name": "Scorpio",
                                  "isCanonicalOrigin": false,
                                  "isOfficialRepresentation": true,
                                  "originChain": "solana",
                                  "originAddress": "J4fQTRN13MKpXhVE74t99msKJLbrjegjEgLBnzEv2YH1",
                                  "bridge": {
                                        "status": "official-bridged",
                                        "protocol": "wormhole",
                                        "sourceChain": "solana",
                                        "destinationChain": "base",
                                        "notes": "Official bridged Base representation deployed through Wormhole BridgeToken contracts."
                                  }
                            }
                      ]
                },
                {
                      "sign": "sagittarius",
                      "displayName": "Sagittarius",
                      "metadata": {
                            "element": "fire",
                            "modality": "mutable",
                            "rulingPlanet": "Jupiter",
                            "archetype": "The Wayfinder",
                            "dateRange": "11-22 to 12-21",
                            "shortBio": "A cultural asset for doctrine, journey, horizon, and the search for meaning."
                      },
                      "native": {
                            "sign": "sagittarius",
                            "chain": "solana",
                            "kind": "native",
                            "tokenStandard": "SPL",
                            "address": "8x17zMmVjJxqswjX4hNpxVPc7Tr5UabVJF3kv8TKq8Y3",
                            "decimals": 6,
                            "symbol": "SAGITTARIUS",
                            "name": "Sagittarius",
                            "isCanonicalOrigin": true,
                            "isOfficialRepresentation": true
                      },
                      "representations": [
                            {
                                  "sign": "sagittarius",
                                  "chain": "solana",
                                  "kind": "native",
                                  "tokenStandard": "SPL",
                                  "address": "8x17zMmVjJxqswjX4hNpxVPc7Tr5UabVJF3kv8TKq8Y3",
                                  "decimals": 6,
                                  "symbol": "SAGITTARIUS",
                                  "name": "Sagittarius",
                                  "isCanonicalOrigin": true,
                                  "isOfficialRepresentation": true
                            },
                            {
                                  "sign": "sagittarius",
                                  "chain": "base",
                                  "chainId": 8453,
                                  "kind": "bridged",
                                  "tokenStandard": "ERC20",
                                  "address": "0xD21fAb1EB5E11AC3C281F7cF8096eCC4683eEa9c",
                                  "decimals": 6,
                                  "symbol": "SAGITTARIUS",
                                  "name": "Sagittarius",
                                  "isCanonicalOrigin": false,
                                  "isOfficialRepresentation": true,
                                  "originChain": "solana",
                                  "originAddress": "8x17zMmVjJxqswjX4hNpxVPc7Tr5UabVJF3kv8TKq8Y3",
                                  "bridge": {
                                        "status": "official-bridged",
                                        "protocol": "wormhole",
                                        "sourceChain": "solana",
                                        "destinationChain": "base",
                                        "notes": "Official bridged Base representation deployed through Wormhole BridgeToken contracts."
                                  }
                            }
                      ]
                },
                {
                      "sign": "capricorn",
                      "displayName": "Capricorn",
                      "metadata": {
                            "element": "earth",
                            "modality": "cardinal",
                            "rulingPlanet": "Saturn",
                            "archetype": "The Institution",
                            "dateRange": "12-22 to 01-19",
                            "shortBio": "A cultural asset for structure, time, ascent, and institutional memory."
                      },
                      "native": {
                            "sign": "capricorn",
                            "chain": "solana",
                            "kind": "native",
                            "tokenStandard": "SPL",
                            "address": "3C2SN1FjzE9MiLFFVRp7Jhkp8Gjwpk29S2TCSJ2jkHn2",
                            "decimals": 6,
                            "symbol": "CAPRICORN",
                            "name": "Capricorn",
                            "isCanonicalOrigin": true,
                            "isOfficialRepresentation": true
                      },
                      "representations": [
                            {
                                  "sign": "capricorn",
                                  "chain": "solana",
                                  "kind": "native",
                                  "tokenStandard": "SPL",
                                  "address": "3C2SN1FjzE9MiLFFVRp7Jhkp8Gjwpk29S2TCSJ2jkHn2",
                                  "decimals": 6,
                                  "symbol": "CAPRICORN",
                                  "name": "Capricorn",
                                  "isCanonicalOrigin": true,
                                  "isOfficialRepresentation": true
                            },
                            {
                                  "sign": "capricorn",
                                  "chain": "base",
                                  "chainId": 8453,
                                  "kind": "bridged",
                                  "tokenStandard": "ERC20",
                                  "address": "0xbFB102C18FDf49f2ffCB9B3aF4522f7DC9f51018",
                                  "decimals": 6,
                                  "symbol": "CAPRICORN",
                                  "name": "Capricorn",
                                  "isCanonicalOrigin": false,
                                  "isOfficialRepresentation": true,
                                  "originChain": "solana",
                                  "originAddress": "3C2SN1FjzE9MiLFFVRp7Jhkp8Gjwpk29S2TCSJ2jkHn2",
                                  "bridge": {
                                        "status": "official-bridged",
                                        "protocol": "wormhole",
                                        "sourceChain": "solana",
                                        "destinationChain": "base",
                                        "notes": "Official bridged Base representation deployed through Wormhole BridgeToken contracts."
                                  }
                            }
                      ]
                },
                {
                      "sign": "aquarius",
                      "displayName": "Aquarius",
                      "metadata": {
                            "element": "air",
                            "modality": "fixed",
                            "rulingPlanet": "Saturn",
                            "archetype": "The Architect",
                            "dateRange": "01-20 to 02-18",
                            "shortBio": "A cultural asset for systems, invention, collective identity, and distance."
                      },
                      "native": {
                            "sign": "aquarius",
                            "chain": "solana",
                            "kind": "native",
                            "tokenStandard": "SPL",
                            "address": "C49Ut3om3QFTDrMZ5Cr8VcTKPpHDcQ2Fv8mmuJHHigDt",
                            "decimals": 6,
                            "symbol": "AQUARIUS",
                            "name": "Aquarius",
                            "isCanonicalOrigin": true,
                            "isOfficialRepresentation": true
                      },
                      "representations": [
                            {
                                  "sign": "aquarius",
                                  "chain": "solana",
                                  "kind": "native",
                                  "tokenStandard": "SPL",
                                  "address": "C49Ut3om3QFTDrMZ5Cr8VcTKPpHDcQ2Fv8mmuJHHigDt",
                                  "decimals": 6,
                                  "symbol": "AQUARIUS",
                                  "name": "Aquarius",
                                  "isCanonicalOrigin": true,
                                  "isOfficialRepresentation": true
                            },
                            {
                                  "sign": "aquarius",
                                  "chain": "base",
                                  "chainId": 8453,
                                  "kind": "bridged",
                                  "tokenStandard": "ERC20",
                                  "address": "0xccA7CD4F96336Fd26eF6c5F579eaC651bAC5535F",
                                  "decimals": 6,
                                  "symbol": "AQUARIUS",
                                  "name": "Aquarius",
                                  "isCanonicalOrigin": false,
                                  "isOfficialRepresentation": true,
                                  "originChain": "solana",
                                  "originAddress": "C49Ut3om3QFTDrMZ5Cr8VcTKPpHDcQ2Fv8mmuJHHigDt",
                                  "bridge": {
                                        "status": "official-bridged",
                                        "protocol": "wormhole",
                                        "sourceChain": "solana",
                                        "destinationChain": "base",
                                        "notes": "Official bridged Base representation deployed through Wormhole BridgeToken contracts."
                                  }
                            }
                      ]
                },
                {
                      "sign": "pisces",
                      "displayName": "Pisces",
                      "metadata": {
                            "element": "water",
                            "modality": "mutable",
                            "rulingPlanet": "Jupiter",
                            "archetype": "The Mystic",
                            "dateRange": "02-19 to 03-20",
                            "shortBio": "A cultural asset for image, faith, continuity, and symbolic dissolution."
                      },
                      "native": {
                            "sign": "pisces",
                            "chain": "solana",
                            "kind": "native",
                            "tokenStandard": "SPL",
                            "address": "3JsSsmGzjWDNe9XCw2L9vznC5JU9wSqQeB6ns5pAkPeE",
                            "decimals": 6,
                            "symbol": "PISCES",
                            "name": "Pisces",
                            "isCanonicalOrigin": true,
                            "isOfficialRepresentation": true
                      },
                      "representations": [
                            {
                                  "sign": "pisces",
                                  "chain": "solana",
                                  "kind": "native",
                                  "tokenStandard": "SPL",
                                  "address": "3JsSsmGzjWDNe9XCw2L9vznC5JU9wSqQeB6ns5pAkPeE",
                                  "decimals": 6,
                                  "symbol": "PISCES",
                                  "name": "Pisces",
                                  "isCanonicalOrigin": true,
                                  "isOfficialRepresentation": true
                            },
                            {
                                  "sign": "pisces",
                                  "chain": "base",
                                  "chainId": 8453,
                                  "kind": "bridged",
                                  "tokenStandard": "ERC20",
                                  "address": "0x43fA1855a89b7A3e07426Fa7a1B44b4187d29Daf",
                                  "decimals": 6,
                                  "symbol": "PISCES",
                                  "name": "Pisces",
                                  "isCanonicalOrigin": false,
                                  "isOfficialRepresentation": true,
                                  "originChain": "solana",
                                  "originAddress": "3JsSsmGzjWDNe9XCw2L9vznC5JU9wSqQeB6ns5pAkPeE",
                                  "bridge": {
                                        "status": "official-bridged",
                                        "protocol": "wormhole",
                                        "sourceChain": "solana",
                                        "destinationChain": "base",
                                        "notes": "Official bridged Base representation deployed through Wormhole BridgeToken contracts."
                                  }
                            }
                      ]
                }
          ]
    };

    const SITE_SIGN_COPY = {
          "aries": {
                "sign": "aries",
                "order": 1,
                "symbol": "♈︎",
                "shortBio": "The first spark. Aries marks the vernal equinox, long honored across civilizations as the renewal of time and the opening of the symbolic year."
          },
          "taurus": {
                "sign": "taurus",
                "order": 2,
                "symbol": "♉︎",
                "shortBio": "The bull held sacred from Çatalhöyük to Knossos. Taurus carries a long memory of fertility, endurance, and material stewardship."
          },
          "gemini": {
                "sign": "gemini",
                "order": 3,
                "symbol": "♊︎",
                "shortBio": "The twins. From Castor and Pollux to the dual nature of language itself, Gemini holds the symbol of human exchange and discourse."
          },
          "cancer": {
                "sign": "cancer",
                "order": 4,
                "symbol": "♋︎",
                "shortBio": "The crab at the summer solstice. Cancer preserves the ancient image of home, memory, and the inner tide."
          },
          "leo": {
                "sign": "leo",
                "order": 5,
                "symbol": "♌︎",
                "shortBio": "The lion. Older than empires. Leo carries the sun at the height of summer. The symbol of radiant authority and visible self."
          },
          "virgo": {
                "sign": "virgo",
                "order": 6,
                "symbol": "♍︎",
                "shortBio": "The maiden of the harvest. Virgo preserves the long lineage of craft, discernment, and the discipline of measure."
          },
          "libra": {
                "sign": "libra",
                "order": 7,
                "symbol": "♎︎",
                "shortBio": "The scales. The autumn equinox. Libra holds the symbol of balance, civic measure, and the law as a cultural form."
          },
          "scorpio": {
                "sign": "scorpio",
                "order": 8,
                "symbol": "♏︎",
                "shortBio": "The scorpion of the deep year. Scorpio carries the rites of transformation. The threshold between what passes and what endures."
          },
          "sagittarius": {
                "sign": "sagittarius",
                "order": 9,
                "symbol": "♐︎",
                "shortBio": "The archer at the galactic center. Sagittarius preserves the impulse to travel, to inquire, to chart what lies beyond the known."
          },
          "capricorn": {
                "sign": "capricorn",
                "order": 10,
                "symbol": "♑︎",
                "shortBio": "The sea-goat. The winter solstice. Capricorn carries the long pattern of structure, lineage, and the building of enduring forms."
          },
          "aquarius": {
                "sign": "aquarius",
                "order": 11,
                "symbol": "♒︎",
                "shortBio": "The water-bearer. Aquarius holds the symbol of the unbound mind: invention, dissent, the long arc of cultural shift."
          },
          "pisces": {
                "sign": "pisces",
                "order": 12,
                "symbol": "♓︎",
                "shortBio": "Two fishes bound by a silver cord. Pisces closes the wheel. The symbol of dissolution, depth, and the world before the next renewal."
          }
    };

    const SIGN_HUES = {
      aries: '#DE8E79',
      taurus: '#B9D4BE',
      gemini: '#B29DD0',
      cancer: '#B6D4E4',
      leo: '#E0A9B4',
      virgo: '#B7D9B0',
      libra: '#D3A9DE',
      scorpio: '#B9DCE8',
      sagittarius: '#E0B080',
      capricorn: '#C0DEA8',
      aquarius: '#AE8FC9',
      pisces: '#A9D4C4'
    };

    const titleCase = (value) => value
      ? value.charAt(0).toUpperCase() + value.slice(1)
      : value;

    function representationFor(asset, chain) {
      return asset.representations.find((representation) => representation.chain === chain);
    }

    function toDisplaySign(asset) {
      const copy = SITE_SIGN_COPY[asset.sign] || {};
      const solana = representationFor(asset, 'solana');
      const base = representationFor(asset, 'base');

      return {
        asset,
        name: asset.displayName,
        ticker: asset.native.symbol || asset.displayName.toUpperCase(),
        order: copy.order || ZODIACS_REGISTRY.assets.indexOf(asset) + 1,
        element: titleCase(asset.metadata.element),
        modality: titleCase(asset.metadata.modality),
        rulingPlanet: asset.metadata.rulingPlanet,
        symbol: copy.symbol || '',
        hue: SIGN_HUES[asset.sign] || '#B9D4BE',
        archetype: asset.metadata.archetype,
        shortBio: copy.shortBio || asset.metadata.shortBio,
        representations: { solana, base }
      };
    }

    const SIGNS = ZODIACS_REGISTRY.assets.map(toDisplaySign);

    // Current zodiac season, derived from registry dateRange metadata
    // ("MM-DD to MM-DD"). Capricorn wraps the year boundary. Visitor-local
    // time; the registry range is the source of truth, not astronomical
    // ingress.
    function parseDateRange(range) {
      const m = /^(\d{2})-(\d{2}) to (\d{2})-(\d{2})$/.exec(range || '');
      return m ? { sm: +m[1], sd: +m[2], em: +m[3], ed: +m[4] } : null;
    }

    function currentSeason(now = new Date()) {
      const md = (now.getMonth() + 1) * 100 + now.getDate();
      for (const sign of SIGNS) {
        const r = parseDateRange(sign.asset.metadata.dateRange);
        if (!r) continue;
        const start = r.sm * 100 + r.sd;
        const end = r.em * 100 + r.ed;
        const inSeason = start <= end
          ? (md >= start && md <= end)
          : (md >= start || md <= end);
        if (!inSeason) continue;
        let seasonStart = new Date(now.getFullYear(), r.sm - 1, r.sd);
        if (seasonStart > now) {
          seasonStart = new Date(now.getFullYear() - 1, r.sm - 1, r.sd);
        }
        let seasonEnd = new Date(seasonStart.getFullYear(), r.em - 1, r.ed);
        if (seasonEnd < seasonStart) {
          seasonEnd = new Date(seasonStart.getFullYear() + 1, r.em - 1, r.ed);
        }
        const day = Math.floor((now - seasonStart) / 86400000) + 1;
        const total = Math.floor((seasonEnd - seasonStart) / 86400000) + 1;
        return { sign, day, total };
      }
      return null;
    }

    function registryProfilePath(sign) {
      return `/registry/${sign?.asset?.sign ?? 'aries'}/`;
    }

    function signDateLabel(sign) {
      const range = parseDateRange(sign?.asset?.metadata?.dateRange);
      if (!range) return sign?.asset?.metadata?.dateRange || '';
      const date = (month, day) => new Date(2024, month - 1, day)
        .toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return `${date(range.sm, range.sd)} – ${date(range.em, range.ed)}`;
    }

    const ZODIAC_MARKET_PAIRS = {
      aries: {
        chainId: 'solana',
        pairId: 'HRn98YLGigP475eS1GaQYRMbqk1V4dkV6tdKyLhVh2iS'
      },
      taurus: {
        chainId: 'solana',
        pairId: '2GNtxia4fLW3URj5MLqVfgoKrAgDpphtAVazK41eTPfu'
      },
      gemini: {
        chainId: 'solana',
        pairId: 'HxhdKrB1UpSwfuMoZMVzPVELzbPWHdyN6PHU9CBFium9'
      },
      leo: {
        chainId: 'solana',
        pairId: '48ErBGMqiZekyLoCcebd7cS5KNQPzqr7QQAK9mzAPQGQ'
      },
      virgo: {
        chainId: 'solana',
        pairId: '5WcVjf8fzPkHaZqTSZDdbDFL6p2bLbAgEigxpevNrcRh'
      },
      libra: {
        chainId: 'solana',
        pairId: 'DTXPQjK4ae4h2Wc7D5Rpij8YmSQxqLuTcNKrpBCjcAN9'
      },
      scorpio: {
        chainId: 'solana',
        pairId: '3d2KYuMgj2yotNC6SKX4HNoeSWp4n8zqZSQ9kFH81Yta'
      },
      capricorn: {
        chainId: 'solana',
        pairId: '549aknNCvxbiqmikS6sAnY6Dbg37MeENWn6ZFBfc7sin'
      },
      aquarius: {
        chainId: 'solana',
        pairId: 'BygCEAhCNyWC8Co9yPa4K84NGkgkgMWdib2FG5hhuiUv'
      },
      pisces: {
        chainId: 'solana',
        pairId: 'Fzz8QrSV8sPKsTtHocwYARE8Zo6Rd4Wv2Ee4JtCuiDko'
      }
    };

    const MARKET_CONTEXT_CACHE = new Map();
    const unavailableMarketContext = (reason = 'unavailable') => ({
      status: 'unavailable',
      reason
    });
    const toFiniteNumber = (value) => {
      if (value === null || value === undefined || value === '') return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };
    function formatPriceUsd(value) {
      const n = toFiniteNumber(value);
      if (n === null) return '—';
      if (Math.abs(n) >= 1) return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const decimals = Math.abs(n) < 0.0001 ? 8 : Math.abs(n) < 0.01 ? 6 : 4;
      return `$${n.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '')}`;
    }
    function formatUsdCompact(value) {
      const n = toFiniteNumber(value);
      if (n === null) return '—';
      const abs = Math.abs(n);
      const compact = (divisor, suffix) => `$${(n / divisor).toLocaleString(undefined, { maximumFractionDigits: 1 })}${suffix}`;
      if (abs >= 1_000_000_000) return compact(1_000_000_000, 'B');
      if (abs >= 1_000_000) return compact(1_000_000, 'M');
      if (abs >= 1_000) return compact(1_000, 'K');
      return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
    function formatPercent(value) {
      const n = toFiniteNumber(value);
      if (n === null) return '—';
      const sign = n > 0 ? '+' : '';
      return `${sign}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    }
    function formatDexId(value) {
      if (!value) return '—';
      return String(value).replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }
    function formatPairDate(value) {
      const n = toFiniteNumber(value);
      if (n === null) return '—';
      const date = new Date(n);
      if (Number.isNaN(date.getTime())) return '—';
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    function parseMarketContextPayload(payload, config) {
      const pairs = Array.isArray(payload?.pairs) ? payload.pairs : null;
      if (!pairs?.length) return unavailableMarketContext('no-pair');
      const pair = pairs.find((item) => eq(item?.pairAddress, config.pairId)) || pairs[0];
      if (!pair || pair.chainId !== config.chainId || !pair.pairAddress) {
        return unavailableMarketContext('malformed');
      }
      return {
        status: 'ok',
        pair: {
          chainId: pair.chainId,
          dexId: pair.dexId || '',
          url: pair.url || '',
          pairAddress: pair.pairAddress,
          priceUsd: pair.priceUsd,
          priceChange24h: pair.priceChange?.h24,
          liquidityUsd: pair.liquidity?.usd,
          marketCap: pair.marketCap,
          pairCreatedAt: pair.pairCreatedAt
        }
      };
    }
    function parseTokenMarketPayload(payload, mint) {
      const pairs = Array.isArray(payload) ? payload : payload?.pairs;
      if (!Array.isArray(pairs) || !pairs.length) return unavailableMarketContext('no-pair');
      let best = null;
      let bestLiquidity = -1;
      for (const pair of pairs) {
        if (!pair?.pairAddress || pair.baseToken?.address !== mint) continue;
        const liquidity = toFiniteNumber(pair.liquidity?.usd) ?? 0;
        if (liquidity > bestLiquidity) {
          bestLiquidity = liquidity;
          best = pair;
        }
      }
      if (!best) return unavailableMarketContext('no-pair');
      return {
        status: 'ok',
        pair: {
          chainId: best.chainId,
          dexId: best.dexId || '',
          url: best.url || '',
          pairAddress: best.pairAddress,
          priceUsd: best.priceUsd,
          priceChange24h: best.priceChange?.h24,
          liquidityUsd: best.liquidity?.usd,
          marketCap: best.marketCap ?? best.fdv,
          pairCreatedAt: best.pairCreatedAt
        }
      };
    }
    function loadMarketContext(config) {
      // A sign with no pinned pair is quoted by its mint instead — the same
      // token endpoint the Market snapshot uses — taking the deepest pool.
      if (config?.tokenMint) {
        const key = `tokens:solana:${config.tokenMint}`;
        if (MARKET_CONTEXT_CACHE.has(key)) return MARKET_CONTEXT_CACHE.get(key);
        const url = `https://api.dexscreener.com/tokens/v1/solana/${encodeURIComponent(config.tokenMint)}`;
        const request = fetch(url)
          .then(async (response) => {
            if (!response.ok) return unavailableMarketContext('http');
            let payload;
            try {
              payload = await response.json();
            } catch {
              return unavailableMarketContext('json');
            }
            return parseTokenMarketPayload(payload, config.tokenMint);
          })
          .catch(() => unavailableMarketContext('network'))
          .then((result) => {
            MARKET_CONTEXT_CACHE.set(key, Promise.resolve(result));
            return result;
          });
        MARKET_CONTEXT_CACHE.set(key, request);
        return request;
      }
      if (!config?.chainId || !config?.pairId) {
        return Promise.resolve(unavailableMarketContext('not-configured'));
      }
      const key = `${config.chainId}:${config.pairId}`;
      if (MARKET_CONTEXT_CACHE.has(key)) return MARKET_CONTEXT_CACHE.get(key);

      const url = `https://api.dexscreener.com/latest/dex/pairs/${encodeURIComponent(config.chainId)}/${encodeURIComponent(config.pairId)}`;
      const request = fetch(url)
        .then(async (response) => {
          if (!response.ok) return unavailableMarketContext('http');
          let payload;
          try {
            payload = await response.json();
          } catch {
            return unavailableMarketContext('json');
          }
          return parseMarketContextPayload(payload, config);
        })
        .catch(() => unavailableMarketContext('network'))
        .then((result) => {
          MARKET_CONTEXT_CACHE.set(key, Promise.resolve(result));
          return result;
        });

      MARKET_CONTEXT_CACHE.set(key, request);
      return request;
    }

    // One batch call quotes all twelve — the same token endpoint the
    // Market snapshot uses — so a landing visit costs a single request
    // no matter how many signs a visitor previews.
    const TWELVE_QUOTES_KEY = 'tokens:solana:twelve';
    const MARKET_DEADLINE_MS = 8000;
    function fetchWithin(url, ms) {
      // Composed by hand — AbortSignal.timeout is still missing from Safari 15.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ms);
      return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
    }
    function loadTwelveMarketQuotes() {
      if (MARKET_CONTEXT_CACHE.has(TWELVE_QUOTES_KEY)) return MARKET_CONTEXT_CACHE.get(TWELVE_QUOTES_KEY);
      const mints = SIGNS.map((s) => s.representations.solana?.address).filter(Boolean);
      const url = `https://api.dexscreener.com/tokens/v1/solana/${mints.join(',')}`;
      const request = fetchWithin(url, MARKET_DEADLINE_MS)
        .then(async (response) => {
          if (!response.ok) return unavailableMarketContext('http');
          let payload;
          try {
            payload = await response.json();
          } catch {
            return unavailableMarketContext('json');
          }
          const pairs = Array.isArray(payload) ? payload : payload?.pairs;
          if (!Array.isArray(pairs)) return unavailableMarketContext('shape');
          const best = new Map();
          for (const pair of pairs) {
            const mint = pair?.baseToken?.address;
            if (!mint || !pair?.pairAddress) continue;
            const liquidity = toFiniteNumber(pair.liquidity?.usd) ?? 0;
            const prev = best.get(mint);
            if (!prev || liquidity > prev.liquidity) best.set(mint, { liquidity, pair });
          }
          const quotes = {};
          for (const sign of SIGNS) {
            const mint = sign.representations.solana?.address;
            const pair = (mint && best.get(mint)?.pair) || null;
            quotes[sign.asset.sign] = pair
              ? {
                  priceUsd: pair.priceUsd,
                  priceChange24h: pair.priceChange?.h24,
                  url: pair.url || ''
                }
              : null;
          }
          return { status: 'ok', quotes };
        })
        .catch(() => unavailableMarketContext('network'))
        .then((result) => {
          // A failed batch is never cached as final — a later look retries.
          if (result.status === 'ok') MARKET_CONTEXT_CACHE.set(TWELVE_QUOTES_KEY, Promise.resolve(result));
          else MARKET_CONTEXT_CACHE.delete(TWELVE_QUOTES_KEY);
          return result;
        });
      MARKET_CONTEXT_CACHE.set(TWELVE_QUOTES_KEY, request);
      return request;
    }
    function useTwelveQuotes(enabled) {
      const [state, setState] = useState({ status: 'idle' });
      useEffect(() => {
        if (!enabled) return undefined;
        let cancelled = false;
        setState({ status: 'loading' });
        loadTwelveMarketQuotes().then((result) => {
          if (!cancelled) setState(result);
        });
        return () => { cancelled = true; };
      }, [enabled]);
      return state;
    }
    function useInView(rootMargin = '0px 0px 15% 0px') {
      const ref = useRef(null);
      const [inView, setInView] = useState(false);
      useEffect(() => {
        const node = ref.current;
        if (!node) return undefined;
        if (typeof IntersectionObserver === 'undefined') { setInView(true); return undefined; }
        const io = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) { setInView(true); io.disconnect(); }
        }, { rootMargin });
        io.observe(node);
        return () => io.disconnect();
      }, [rootMargin]);
      return [ref, inView];
    }
    function marketChangeClass(value) {
      const n = toFiniteNumber(value);
      if (n === null) return '';
      return n > 0 ? ' market__change--up' : n < 0 ? ' market__change--down' : ' market__change--flat';
    }

    // Verifier lookup helpers — same registry semantics exposed by
    // @zodiacs/sdk through isOfficialZodiacAddress() etc.
    const norm = (s) => (s || '').trim();
    const eq = (a, b) => norm(a).toLowerCase() === norm(b).toLowerCase();
    const eqRegistryAddress = (representation, candidate) => (
      representation.chain === 'base'
        ? eq(representation.address, candidate)
        : norm(representation.address) === norm(candidate)
    );
    function lookupAddress(input) {
      const q = norm(input);
      if (!q) return null;
      for (const sign of SIGNS) {
        for (const representation of sign.asset.representations) {
          if (representation.address && eqRegistryAddress(representation, q)) {
            return { sign, network: representation.chain, representation };
          }
        }
      }
      return null;
    }
    function truncateAddress(a, lead = 6, tail = 4) {
      if (!a || a.length <= lead + tail + 2) return a || '';
      return `${a.slice(0, lead)}…${a.slice(-tail)}`;
    }

    const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

    // ──────────────────────────────────────────────────────────────
    // Sub-components
    // ──────────────────────────────────────────────────────────────

    function Header() {
      const [menuOpen, setMenuOpen] = useState(false);
      const [signsOpen, setSignsOpen] = useState(false);
      useEffect(() => {
        if (!menuOpen) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
        document.addEventListener('keydown', onKey);
        const prev = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', onKey); document.documentElement.style.overflow = prev; };
      }, [menuOpen]);
      useEffect(() => {
        if (!signsOpen) return undefined;
        const onDoc = (e) => { if (!e.target.closest('.wnav-wrap')) setSignsOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setSignsOpen(false); };
        document.addEventListener('click', onDoc);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
      }, [signsOpen]);
      const NAV_SIGNS = [
        { slug: 'aries', name: 'Aries', glyph: '♈', dates: 'Mar 21 – Apr 19', hue: '#DE8E79' },
        { slug: 'taurus', name: 'Taurus', glyph: '♉', dates: 'Apr 20 – May 20', hue: '#B9D4BE' },
        { slug: 'gemini', name: 'Gemini', glyph: '♊', dates: 'May 21 – Jun 20', hue: '#B29DD0' },
        { slug: 'cancer', name: 'Cancer', glyph: '♋', dates: 'Jun 21 – Jul 22', hue: '#B6D4E4' },
        { slug: 'leo', name: 'Leo', glyph: '♌', dates: 'Jul 23 – Aug 22', hue: '#E0A9B4' },
        { slug: 'virgo', name: 'Virgo', glyph: '♍', dates: 'Aug 23 – Sep 22', hue: '#B7D9B0' },
        { slug: 'libra', name: 'Libra', glyph: '♎', dates: 'Sep 23 – Oct 22', hue: '#D3A9DE' },
        { slug: 'scorpio', name: 'Scorpio', glyph: '♏', dates: 'Oct 23 – Nov 21', hue: '#B9DCE8' },
        { slug: 'sagittarius', name: 'Sagittarius', glyph: '♐', dates: 'Nov 22 – Dec 21', hue: '#E0B080' },
        { slug: 'capricorn', name: 'Capricorn', glyph: '♑', dates: 'Dec 22 – Jan 19', hue: '#C0DEA8' },
        { slug: 'aquarius', name: 'Aquarius', glyph: '♒', dates: 'Jan 20 – Feb 18', hue: '#AE8FC9' },
        { slug: 'pisces', name: 'Pisces', glyph: '♓', dates: 'Feb 19 – Mar 20', hue: '#A9D4C4' },
      ];
      const NAV_TOOLS = [
        { href: '/birth-chart/', name: 'Birth chart', description: 'See your sun, moon, rising, planets, houses, and what they mean.' },
        { href: '/compatibility/', name: 'Compatibility', description: 'Compare two charts and see where they click, clash, and grow.' },
        { href: '/transits/', name: 'Transits', description: "See today's sky next to your chart." },
        { href: '/moon-sign/', name: 'Moon sign', description: 'How you feel, and what settles you.' },
        { href: '/rising-sign/', name: 'Rising sign', description: 'Find the sign people meet first. Birth time helps.' },
        { href: '/moon-phase/', name: 'Moon phase', description: 'Tonight’s moon, and the moon of any date you care about.' },
        { href: '/saturn-return/', name: 'Saturn return', description: 'When yours hits, exactly, and what it tends to ask.' },
        { href: '/birthday/', name: 'Birthday', description: 'Pick your birthday and get the receipts: sun sign verified across 1940–2030, exact degree spans, decans with traditional rulers, and year-by-year cusp tables.' },
      ];
      return (
        <>
          <div className="wnav-wrap">
            <nav className="wnav" aria-label="Primary">
              <a className="wnav__mark" href="/">
                <span className="wnav__name">Zodiacs<span className="wnav__sep">·</span><span className="wnav__dim">org</span></span>
              </a>
              <div className="wnav__links">
                <a className="wnav__link" href="/tools/">Tools<svg width="8" height="5" viewBox="0 0 8 5" fill="none" aria-hidden="true"><path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></a>
                <button className="wnav__link wnav__signs-btn" type="button" aria-expanded={signsOpen} aria-controls="wnav-signs" onClick={() => setSignsOpen((v) => !v)}>Signs<svg width="8" height="5" viewBox="0 0 8 5" fill="none" aria-hidden="true"><path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                <a className="wnav__link" href="/learn/">Learn</a>
                <a className="wnav__link" href="/horoscopes/">Horoscopes</a>
                <a className="wnav__link" href="/profile/">Saved charts</a>
              </div>
              <a className="wnav__search" href="/?search=1" aria-label="Search the site">
                <svg width="14" height="14" viewBox="0 0 15 15" fill="none" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.75" stroke="currentColor" strokeWidth="1.4"/><path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                <kbd className="wnav__search-kbd" aria-hidden="true">/</kbd>
              </a>
              <a className="wnav__chip" href="/registry/" aria-current="page">Registry</a>
              <button type="button" className="wnav__burger" aria-expanded={menuOpen} aria-controls="wnav-menu" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen((v) => !v)}>
                <span className="wnav__burger-line" /><span className="wnav__burger-line" /><span className="wnav__burger-line" />
              </button>
            </nav>
            <div className={signsOpen ? 'wnav-signs is-open' : 'wnav-signs'} id="wnav-signs" hidden={!signsOpen}>
              <div className="wnav-signs__grid">
                {NAV_SIGNS.map((s) => (
                  <a className="wnav-signs__item" key={s.slug} href={`/${s.slug}/`} style={{ '--sign': s.hue }} onClick={() => setSignsOpen(false)}>
                    <picture className="wnav-disc"><source srcSet={`/assets/zodiac-icons/128/${s.slug}.avif`} type="image/avif" /><img src={`/assets/zodiac-icons/128/${s.slug}.webp`} width="32" height="32" alt="" loading="lazy" decoding="async" /></picture>
                    <span className="wnav-signs__name">{s.name}</span>
                    <span className="wnav-signs__dates">{s.dates}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div id="wnav-menu" className={menuOpen ? 'wnav-menu is-open' : 'wnav-menu'} hidden={!menuOpen} onClick={(e) => { if (e.target.closest('a')) setMenuOpen(false); }}>
            <nav aria-label="Mobile">
              <div className="wnav-menu__group">
                <span className="wnav-menu__label">The site</span>
                <a className="wnav-menu__link" style={{ '--i': 0 }} href="/learn/">Learn</a>
                <a className="wnav-menu__link" style={{ '--i': 1 }} href="/horoscopes/">Horoscopes</a>
                <a className="wnav-menu__link" style={{ '--i': 2 }} href="/profile/">Saved charts</a>
                <a className="wnav-menu__link wnav-menu__registry" style={{ '--i': 3 }} href="/registry/" aria-current="page">
                  <span>Registry</span>
                  <small>Digital collection and registry</small>
                </a>
              </div>
              <div className="wnav-menu__group">
                <span className="wnav-menu__label">Tools</span>
                <div className="wnav-menu__tools">
                  {NAV_TOOLS.map((tool, i) => (
                    <a className="wnav-menu__tool" key={tool.href} style={{ '--i': i }} href={tool.href} aria-label={`${tool.name}. ${tool.description}`}>{tool.name}</a>
                  ))}
                </div>
              </div>
              <div className="wnav-menu__group">
                <span className="wnav-menu__label">The twelve</span>
                <div className="wnav-menu__signs">
                  {NAV_SIGNS.map((s, i) => (
                    <a className="wnav-menu__sign" key={s.slug} style={{ '--i': i, '--sign': s.hue }} href={`/${s.slug}/`} aria-label={s.name}>
                      <picture className="wnav-disc wnav-disc--lg"><source srcSet={`/assets/zodiac-icons/128/${s.slug}.avif`} type="image/avif" /><img src={`/assets/zodiac-icons/128/${s.slug}.webp`} width="40" height="40" alt="" loading="lazy" decoding="async" /></picture>
                      <span>{s.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            </nav>
          </div>
        </>
      );
    }

    // ---- Cinematic opening — full-bleed ambient film ------------------------
    // The first viewport: the registry's own film (a slow macro pan
    // across a painted astronomical dial, palindrome-looped) under a
    // quiet wordmark. Poster paints first; the film pauses off-screen
    // and stands down entirely for reduced motion or data-saver.
    // Portrait phones get a baked 9:16 crop; everything else the
    // landscape master. Lives outside the .zd shell — the shell clips
    // horizontal overflow, and this act must run edge to edge.
    function CineHero({ sign }) {
      const videoRef = useRef(null);
      // Shares the main site's hero footage so the wing opens on the same
      // image as zodiacs.org — one master serves every orientation (there is
      // no portrait crop of it, and the frame is composed to hold centre).
      const media = useMemo(() => ({
        src: '/assets/hero/zodiacs-hero.mp4',
        poster: '/assets/hero/zodiacs-hero-poster.avif'
      }), []);
      useEffect(() => {
        const video = videoRef.current;
        if (!video) return undefined;
        // Poster stands in for reduced-motion — never attach or play the film.
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
        // Mirror the main site's hero (index.astro): an explicit muted play()
        // rather than the `autoplay` attribute — mobile Safari / Low-Power /
        // Data-Saver routinely ignore autoplay but honour a scripted play on a
        // muted, inline video. The film only attaches on first play so the
        // poster wins first paint; no `saveData` stand-down (the poster is
        // already the light path, and the owner wants the film to animate).
        const play = () => {
          if (!video.isConnected) return;
          if (!video.src) { video.src = media.src; video.preload = 'auto'; }
          const p = video.play();
          if (p && p.catch) p.catch(() => {});
        };
        // The observer fires on mount (the hero opens on screen), so it both
        // starts the opening playback and pauses the full-bleed film when it
        // scrolls away — resuming when it returns.
        let io;
        if ('IntersectionObserver' in window) {
          io = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) play();
            else { try { video.pause(); } catch { /* poster stands in */ } }
          }, { threshold: 0.05 });
          io.observe(video);
        } else {
          play();
        }
        // Restore playback after a bfcache back/forward (pageshow.persisted).
        const onShow = (e) => { if (e.persisted) play(); };
        window.addEventListener('pageshow', onShow);
        return () => { window.removeEventListener('pageshow', onShow); if (io) io.disconnect(); };
      }, [media.src]);
      return (
        <section className="cine" aria-label="Zodiacs.org — the official registry of the Twelve">
          <div className="cine__frame">
            <video
              ref={videoRef}
              className="cine__media"
              muted
              loop
              playsInline
              preload="none"
              poster={media.poster}
              aria-hidden="true"
              tabIndex={-1}
            />
            <div className="cine__scrim" aria-hidden="true" />
            <div className="cine__content">
              <a className="cine__eyebrow" href="/disclosure/">
                The Official Registry · Est. {REGISTRY_ESTABLISHED}
                {!REGISTRY_ESTABLISHMENT_PROVENANCE_URL && ' · provenance pending'}
              </a>
              <h1 className="cine__title">
                Twelve signs.<br/>
                <span className="it">One register.</span>
              </h1>
              <div className="cine__foot">
                <p className="cine__line">
                  Every sign has one official token. Explore its story, its record, and its market.
                </p>
                <div className="cine__cta">
                  <a className="btn btn--primary" href="#official-twelve" data-registry-browse>
                    <span>Choose a token</span>
                    <span className="arr">↓</span>
                  </a>
                  <a className="btn btn--ghost" href="#verify">
                    <span>Check an address</span>
                    <span className="cta-arr" aria-hidden="true">↓</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }

    /* Read-only copy chip — visible as a monospace truncated address;
       click copies the full address to clipboard and flashes "Copied". */
    function CopyChip({ text, display }) {
      const [copied, setCopied] = useState(false);
      const onCopy = useCallback(() => {
        if (!text) return;
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          });
        }
      }, [text]);
      return (
        <button
          type="button"
          className={'copychip' + (copied ? ' is-copied' : '')}
          onClick={onCopy}
          aria-label={`${display || text}. Copy full address`}
          title={text}
        >
          <span className="copychip__text mono">{display || text}</span>
          <span className="copychip__icon" aria-hidden="true" />
        </button>
      );
    }

    /* The gallery band — the twelve Gold Sculptures as the hub's selector.
       Set before first paint by the head probe; constant for the page's
       life, so the strip and the band never both render. */
    const GALLERY_LIVE = document.documentElement.classList.contains('gallery-live');

    let galleryBundleRequested = false;

    // Inert pastel discs hold the rail's shape until the scene bundle
    // arrives and swaps in the live ticks with one replaceChildren call.
    // Rendered via dangerouslySetInnerHTML with a constant string so React
    // never reconciles the rail's children after the scene owns them.
    const RAIL_PLACEHOLDER_HTML = SIGNS.map((s) => (
      `<span class="rail__tick rail__tick--placeholder" style="--sign:${s.hue}" aria-hidden="true">`
      + '<picture>'
      + `<source srcset="/assets/zodiac-icons/48/${s.asset.sign}.avif" type="image/avif"/>`
      + `<img src="/assets/zodiac-icons/48/${s.asset.sign}.webp" width="26" height="26" alt="" loading="lazy" decoding="async"/>`
      + '</picture></span>'
    )).join('');

    function GalleryBand({ active, setActive, consumer = false }) {
      const stageRef = useRef(null);
      // The slug the scene last announced — the guard that keeps the
      // selection loop (scene → state → scene) from echoing.
      const gallerySlug = useRef(null);
      const slug = (SIGNS.find(s => s.ticker === active) ?? SIGNS[0]).asset.sign;

      // The scene bundle carries Three.js; it is fetched only as the band
      // approaches the viewport, and only once.
      useEffect(() => {
        const node = stageRef.current;
        if (!node) return undefined;
        const inject = () => {
          if (galleryBundleRequested) return;
          galleryBundleRequested = true;
          const script = document.createElement('script');
          script.src = '/assets/gallery.js';
          script.defer = true;
          document.body.appendChild(script);
        };
        if (!('IntersectionObserver' in window)) { inject(); return undefined; }
        const io = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) { inject(); io.disconnect(); }
        }, { rootMargin: '400px 0px' });
        io.observe(node);
        return () => io.disconnect();
      }, []);

      // Scene → page: walking the row selects the sign everywhere below.
      useEffect(() => {
        const node = stageRef.current;
        if (!node) return undefined;
        const onSign = (event) => {
          const next = event?.detail?.slug;
          if (!next) return;
          gallerySlug.current = next;
          const match = SIGNS.find(s => s.asset.sign === next);
          if (match) setActive(match.ticker);
        };
        node.addEventListener('zodiacs:gallery-sign', onSign);
        return () => node.removeEventListener('zodiacs:gallery-sign', onSign);
      }, [setActive]);

      // Page → scene: any other selector turns the row to match.
      useEffect(() => {
        const node = stageRef.current;
        if (!node || gallerySlug.current === slug) return;
        node.dispatchEvent(new CustomEvent('zodiacs:gallery-focus', { detail: { slug } }));
      }, [slug]);

      return (
        <section
          ref={stageRef}
          id="gallery"
          className={'gband' + (consumer ? ' gband--consumer' : '')}
          aria-label="The Gallery — the twelve Gold Sculptures"
          data-gallery-stage=""
          data-gallery-embed=""
          data-gallery-initial={slug}
        >
          <div className="gband__mount" data-gallery-canvas="" />
          <p className="gband__name" data-gallery-name="" aria-hidden="true" />
          <div className="gband__chrome">
            <div
              className="rail"
              data-gallery-rail=""
              role="group"
              aria-label="The twelve sculptures"
              dangerouslySetInnerHTML={{ __html: RAIL_PLACEHOLDER_HTML }}
            />
            <button className="gband__open" type="button" data-gallery-open="">
              View the sculpture
            </button>
            <p className="gband__hint" data-gallery-hint="">
              Drag to browse · Choose a sign to open.
            </p>
          </div>

          <aside className="gcard" data-gallery-card="" hidden aria-labelledby="gcard-name" aria-live="off">
            <button className="card__close" type="button" data-gallery-close="" aria-label="Return the sculpture">✕</button>
            <p className="card__lot" data-card-lot="" />
            <h2 className="card__name" id="gcard-name" data-card-name="" />
            <p className="card__figure" data-card-figure="" />

            <div className="card__market" hidden={consumer}>
              <p className="card__market-state" data-market-state="">Loading market context.</p>
              <div className="card__price" data-market-price-row="" hidden>
                <span className="card__price-value" data-market-price="" />
                <span className="card__price-change" data-market-change="" />
              </div>
              <div className="card__cta" data-market-cta="" hidden>
                <a className="card__buy" data-market-jupiter="" rel="noopener noreferrer external nofollow">
                  <span>Open Jupiter route</span><span aria-hidden="true">↗</span>
                </a>
                <a className="card__data" data-market-dexscreener="" rel="noopener noreferrer external nofollow">
                  <span>View market data</span><span aria-hidden="true">↗</span>
                </a>
              </div>
              <dl className="card__market-grid" data-market-grid="" hidden />
              <p className="card__risk">
                Independent third-party data, not a valuation or recommendation.
                It may be delayed or unavailable; prices and liquidity can
                change quickly, and a Zodiac can lose all market value. The
                route above opens an independent third-party venue; this
                Registry page does not request custody, signing, approvals, or
                transactions. Operator and economic-interest statements remain
                pending confirmation; see the <a href="/disclosure/">Disclosure</a>.
              </p>
            </div>

            <dl className="card__facts" data-card-facts="" />
            <div className="card__records" data-card-records="" />
            <a className="card__entry" data-card-entry="" href="/registry/">
              <span>Open catalogue entry</span><span aria-hidden="true">→</span>
            </a>
          </aside>

          <p className="sr-only" role="status" aria-live="polite" data-gallery-live="" />
        </section>
      );
    }

    /* Verifier — the most strategically important section on the page.
       Real working JS against the embedded SIGNS array. Three states:
       found-base, found-solana, not-found. Neutral copy for unknowns. */
    function VerifierSection() {
      const reveal = useReveal();
      const [input, setInput] = useState('');
      const [result, setResult] = useState(null);
      const onSubmit = (e) => {
        e.preventDefault();
        const query = norm(input);
        const chain = /^0x[0-9a-f]{40}$/i.test(query)
          ? 'base'
          : /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query) ? 'solana' : 'invalid';
        if (chain === 'invalid') {
          trackAnalytics('verifier_used', { chain, outcome: 'invalid' });
          setResult({ state: 'invalid', queried: query });
          return;
        }
        const hit = lookupAddress(query);
        trackAnalytics('verifier_used', { chain, outcome: hit ? 'official' : 'not_found' });
        if (!hit) {
          setResult({ state: 'not-found', queried: query });
          return;
        }
        setResult({ state: 'official', sign: hit.sign, network: hit.network, queried: query });
      };
      const onClear = () => { setInput(''); setResult(null); };
      const examples = ['LEO', 'CANCER', 'PISCES'].map(t => SIGNS.find(s => s.ticker === t));
      const networkLabel = result?.network === 'base' ? 'Base' : 'Solana';

      return (
        <section ref={reveal} id="verify" className="sec consumer-verify reveal" aria-labelledby="verify-title">
          <div className="consumer-section-head">
            <span className="consumer-section-head__eyebrow">Check the public list</span>
            <h2 id="verify-title">Check a Zodiac token address.</h2>
          </div>
          <p className="consumer-verify__intro">
            Paste the mint or contract address shown by a wallet or marketplace.
            We&rsquo;ll tell you whether it appears in the official list. Never paste a seed phrase.
          </p>
          <p className="consumer-verify__distinction">
            This checks a Zodiac&rsquo;s token address, not your public wallet address.
          </p>

          <form className="vrf" onSubmit={onSubmit}>
            <label className="sr-only" htmlFor="vrf-input">Zodiac mint or contract address</label>
            <input
              id="vrf-input"
              className="vrf__input mono"
              type="text"
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
              placeholder="Mint or contract address"
              value={input}
              onChange={e => {
                setInput(e.target.value);
                if (result) setResult(null);
              }}
            />
            <button type="submit" className="vrf__submit">Check address</button>
          </form>

          <div className="vrf__examples">
            <span className="label label--mute">Try an official example</span>
            {examples.map(s => (
              <button
                key={s.ticker}
                type="button"
                className="vrf__example"
                onClick={() => setInput(s.representations.base.address)}
              >
                {s.name}
              </button>
            ))}
            {input && (
              <button type="button" className="vrf__example vrf__example--clear" onClick={onClear}>
                Clear
              </button>
            )}
          </div>

          {result && (
            <div
              className={'vrf__result vrf__result--' + result.state}
              role="status"
              aria-live="polite"
              data-verifier-state={result.state}
            >
              {result.state === 'official' && (
                <>
                  <div className="vrf__result-head">
                    <span className="vrf__tick">✓</span>
                    <span>{`Official ${result.sign.name} address on ${networkLabel}.`}</span>
                  </div>
                  <VrfResultBody sign={result.sign} network={result.network} queried={result.queried} />
                </>
              )}
              {result.state === 'not-found' && (
                <>
                  <div className="vrf__result-head">
                    <span className="vrf__cross">×</span>
                    <span>{'This address isn’t in the official Zodiac list.'}</span>
                  </div>
                  <div className="vrf__result-meta mono">{truncateAddress(result.queried, 10, 8) || '—'}</div>
                </>
              )}
              {result.state === 'invalid' && (
                <div className="vrf__result-head">
                  <span className="vrf__cross">×</span>
                  <span>{'That doesn’t look like a Solana or Base address.'}</span>
                </div>
              )}
            </div>
          )}

          <p className="consumer-verify__safety">
            Read-only: this checker never connects a wallet, requests a signature, or starts a transaction.
          </p>
        </section>
      );
    }

    function VrfResultBody({ sign, network, queried }) {
      return (
        <div className="vrf__result-body">
          <div className="vrf__result-sign">
            <img
              className="vrf__result-icon"
              src={`/assets/zodiac-icons/48/${sign.asset.sign}.webp`}
              alt=""
              width="40"
              height="40"
              decoding="async"
            />
            <div>
              <div className="vrf__result-name">{sign.name}</div>
              <div className="vrf__result-meta">
                <span className="mono">{sign.ticker}</span>
                <span className="dot" />
                <span>{sign.element}</span>
                <span className="dot" />
                <span>{sign.modality}</span>
                <span className="dot" />
                <span>{sign.rulingPlanet}</span>
              </div>
            </div>
          </div>
          <dl className="vrf__result-rows">
            <div className="detail__row">
              <dt className="k">Found on</dt>
              <dd className="v">{network === 'base' ? 'Base' : 'Solana'}</dd>
            </div>
            <div className="detail__row">
              <dt className="k">Address</dt>
              <dd className="v"><CopyChip text={queried} display={truncateAddress(queried, 8, 6)} /></dd>
            </div>
            <div className="detail__row">
              <dt className="k">{network === 'base' ? 'Original Solana record' : 'Base counterpart'}</dt>
              <dd className="v">
                {network === 'base'
                  ? (sign.representations.solana.address
                      ? <CopyChip text={sign.representations.solana.address} display={truncateAddress(sign.representations.solana.address, 4, 4)} />
                      : <span className="card__addr-pending">Forthcoming</span>)
                  : <CopyChip text={sign.representations.base.address} display={truncateAddress(sign.representations.base.address, 6, 4)} />}
              </dd>
            </div>
          </dl>
        </div>
      );
    }

    function useMarketContext(sign, enabled) {
      const signKey = sign?.asset?.sign;
      // Cancer and Sagittarius carry no pinned pair; their quote comes from
      // the token endpoint by mint, so all twelve show live numbers whenever
      // DexScreener indexes anything.
      const fallbackMint = sign?.representations?.solana?.address || null;
      const config = (signKey ? ZODIAC_MARKET_PAIRS[signKey] : null)
        ?? (fallbackMint ? { tokenMint: fallbackMint } : null);
      const [state, setState] = useState(
        config ? { status: 'idle' } : unavailableMarketContext('not-configured')
      );

      useEffect(() => {
        let cancelled = false;
        if (!config) {
          setState(unavailableMarketContext('not-configured'));
          return () => { cancelled = true; };
        }
        // Defer the third-party request until the panel is actually in
        // view. Autoplay rotates the featured sign, and we don't want to
        // fan out a fetch for every sign before the reader scrolls here.
        if (!enabled) {
          setState({ status: 'idle' });
          return () => { cancelled = true; };
        }

        setState({ status: 'loading' });
        loadMarketContext(config).then((result) => {
          if (!cancelled) setState(result);
        });

        return () => { cancelled = true; };
      }, [signKey, enabled]);

      return { config, state };
    }

    /* ── The Pulse — attention instrument ─────────────────────────
       Measured layer: Wikipedia pageviews for the twelve sign articles,
       fetched from the open Wikimedia API (snapshot in /assets/pulse.json,
       refreshed live in the visitor's browser). Search layer: Google
       Trends snapshot + link-out. Platform layer: editorial estimates,
       footnoted as approximations. Lazy-loaded; unavailable-safe. */
    const WIKI_SIGN_ARTICLES = SIGNS.map(s => `${s.name}_(astrology)`);

    function formatCompact(n) {
      if (n == null || !isFinite(n)) return '—';
      if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return String(Math.round(n));
    }

    function pulseDateRange() {
      const end = new Date(Date.now() - 24 * 3600 * 1000);
      const start = new Date(end.getTime() - 29 * 24 * 3600 * 1000);
      const ymd = (d) => d.toISOString().slice(0, 10).replaceAll('-', '');
      return [ymd(start), ymd(end)];
    }

    function fetchLiveTwelve() {
      const [start, end] = pulseDateRange();
      const cacheKey = 'zd-pulse-live-' + end;
      try {
        const hit = sessionStorage.getItem(cacheKey);
        if (hit) return Promise.resolve(JSON.parse(hit));
      } catch (e) { /* storage unavailable */ }
      return Promise.all(
        WIKI_SIGN_ARTICLES.map(a =>
          fetch(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(a)}/daily/${start}/${end}`)
            .then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        )
      ).then(results => {
        const byDate = new Map();
        for (const j of results) {
          for (const item of (j.items ?? [])) {
            const d = item.timestamp.slice(0, 8);
            byDate.set(d, (byDate.get(d) ?? 0) + item.views);
          }
        }
        const series = [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => v);
        if (!series.length) throw new Error('empty');
        const avg = Math.round(series.reduce((s, v) => s + v, 0) / series.length);
        const out = { avgDay: avg, lastDay: series[series.length - 1], series };
        try { sessionStorage.setItem(cacheKey, JSON.stringify(out)); } catch (e) { /* ignore */ }
        return out;
      });
    }

    function Sparkline({ series }) {
      if (!series || series.length < 2) return null;
      const w = 320, h = 56, pad = 4;
      const min = Math.min(...series), max = Math.max(...series);
      const span = Math.max(max - min, 1);
      const pts = series.map((v, i) => {
        const x = pad + (i / (series.length - 1)) * (w - pad * 2);
        const y = h - pad - ((v - min) / span) * (h - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      return (
        <svg className="pulse__spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="30-day attention sparkline">
          <polyline points={pts} fill="none" stroke="var(--gold)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    }

    function PulseSection() {
      const reveal = useReveal();
      const hostRef = useRef(null);
      const [enabled, setEnabled] = useState(false);
      const [pulse, setPulse] = useState(null);   // snapshot JSON
      const [live, setLive] = useState(null);     // live Wikipedia refresh
      const [failed, setFailed] = useState(false);

      useEffect(() => {
        const el = hostRef.current;
        if (!el || enabled) return undefined;
        if (!('IntersectionObserver' in window)) { setEnabled(true); return undefined; }
        const io = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) { setEnabled(true); io.disconnect(); }
        }, { rootMargin: '240px 0px' });
        io.observe(el);
        return () => io.disconnect();
      }, [enabled]);

      useEffect(() => {
        if (!enabled) return;
        fetch('/assets/pulse.json')
          .then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
          .then(setPulse)
          .catch(() => setFailed(true));
        fetchLiveTwelve().then(setLive).catch(() => { /* snapshot remains */ });
      }, [enabled]);

      const wiki = pulse?.wikipedia;
      const avgDay = live?.avgDay ?? wiki?.twelveAvgDay;
      const series = live?.series ?? wiki?.series?.map(d => d.views);
      const sourceLabel = live
        ? 'Source: Wikimedia · live'
        : (wiki ? `Source: Wikimedia · captured ${pulse.capturedAt}` : '');
      const trends = pulse?.trends;
      const trendsMax = trends ? Math.max(...trends.averages, 1) : 1;

      return (
        <section ref={reveal} id="pulse" className="sec reveal" aria-label="The Pulse">
          <div className="sec__head">
            <span className="sec__no">Nº 05</span>
            <span className="line" />
            <h2 className="sec__title">The Pulse</h2>
          </div>

          <h3 className="pulse__statement">
            Attention is the <span className="it">oldest currency.</span>
          </h3>
          <p className="sec__lede">
            The Twelve are read, tagged, and searched every day at a scale
            most tokens never touch. Measured where measurement is open;
            estimated — and labeled — where it is not.
          </p>

          <div ref={hostRef} className="pulse" aria-busy={enabled && !pulse && !failed}>
            {failed && !pulse && (
              <div className="pulse__state">Attention data unavailable — the argument stands in the <a href="/thesis/">thesis</a>.</div>
            )}

            {wiki && (
              <>
                <div className="pulse__head">
                  <span className="label label--gold">Reading the Twelve</span>
                  <span className="pulse__src">{sourceLabel}{live ? <span className="pulse__dot" aria-hidden="true" /> : null}</span>
                </div>
                <div className="pulse__grid">
                  <div className="pulse__cell pulse__cell--wide">
                    <div className="pulse__k">Encyclopedia reads · all twelve signs</div>
                    <div className="pulse__v">{formatCompact(avgDay)}<span className="pulse__unit"> / day</span></div>
                    {series ? <Sparkline series={series} /> : null}
                    <div className="pulse__sub">Trailing 30 days · en.wikipedia</div>
                  </div>
                  {(wiki.comparisons ?? []).map(c => (
                    <div className="pulse__cell" key={c.label}>
                      <div className="pulse__k">vs {c.label}</div>
                      <div className="pulse__v pulse__v--x">{c.multiple}×</div>
                      <div className="pulse__sub">{formatCompact(c.avgDay)} / day · single article</div>
                    </div>
                  ))}
                </div>

                {wiki.perSignAvgDay && (wiki.comparisons ?? []).length > 0 && (() => {
                  const rows = SIGNS
                    .map(s => ({ name: s.name, slug: s.asset.sign, v: wiki.perSignAvgDay[s.asset.sign] }))
                    .filter(r => Number.isFinite(r.v));
                  if (!rows.length) return null;
                  const strongest = wiki.comparisons.reduce((a, b) => (b.avgDay > a.avgDay ? b : a));
                  const maxSign = Math.max(...rows.map(r => r.v));
                  const weakest = Math.min(...rows.map(r => r.v));
                  const sorted = rows.map(r => r.v).sort((a, b) => a - b);
                  const median = sorted[Math.floor(sorted.length / 2)];
                  const ratio = weakest / Math.max(strongest.avgDay, 1);
                  const tickPct = Math.min((strongest.avgDay / maxSign) * 100, 100);
                  return (
                    <div className="pulse__block">
                      <div className="pulse__head">
                        <span className="label label--gold">One sign at a time</span>
                        <span className="pulse__src">Wikimedia · single articles, same window</span>
                      </div>
                      <p className="pulse__claim">
                        {ratio > 1
                          ? `No aggregation needed: every sign, alone, out-reads every token article. The quietest sign runs ${ratio.toFixed(1)}× the strongest token.`
                          : `One on one: the median sign reads at ${(median / Math.max(strongest.avgDay, 1)).toFixed(1)}× the strongest token article.`}
                      </p>
                      <div className="pulse__bars">
                        {rows.map(r => (
                          <div className="pulse__bar" key={r.name}>
                            <span className="pulse__bar-k pulse__bar-k--sign">
                              <span className="pulse__bar-name">{r.name}</span>
                              <img
                                className="pulse__bar-icon"
                                src={`/assets/zodiac-icons/48/${r.slug}.webp`}
                                width="14"
                                height="14"
                                alt=""
                                loading="lazy"
                                decoding="async"
                              />
                            </span>
                            <span className="pulse__bar-track">
                              <span
                                className="pulse__bar-fill is-twelve"
                                style={{ width: Math.max((r.v / maxSign) * 100, 2) + '%' }}
                              />
                              <span className="pulse__bar-tick" style={{ left: tickPct + '%' }} aria-hidden="true" />
                            </span>
                            <span className="pulse__bar-v">{formatCompact(r.v)}</span>
                          </div>
                        ))}
                      </div>
                      <p className="pulse__note">
                        Reads per day, one disambiguated article per sign.
                        Gold line: the strongest token article in the same
                        window ({strongest.label}, {formatCompact(strongest.avgDay)} / day).
                        Token articles: {wiki.comparisons.map(c => `${c.label} ${formatCompact(c.avgDay)}`).join(' · ')}.
                      </p>
                    </div>
                  );
                })()}
              </>
            )}

            {trends && (
              <div className="pulse__block">
                <div className="pulse__head">
                  <span className="label label--gold">Searching the sky</span>
                  <span className="pulse__src">Source: Google Trends · captured {trends.capturedAt} · 12mo relative</span>
                </div>
                <div className="pulse__bars">
                  {trends.terms.map((t, i) => (
                    <div className="pulse__bar" key={t}>
                      <span className="pulse__bar-k">“{t}”</span>
                      <span className="pulse__bar-track">
                        <span
                          className={'pulse__bar-fill' + (i === 0 ? ' is-twelve' : '')}
                          style={{ width: Math.max((trends.averages[i] / trendsMax) * 100, 2) + '%' }}
                        />
                      </span>
                      <span className="pulse__bar-v">{trends.averages[i]}</span>
                    </div>
                  ))}
                </div>
                <a
                  className="pulse__out"
                  href={`https://trends.google.com/trends/explore?date=today%2012-m&q=${encodeURIComponent(trends.terms.join(','))}`}
                  rel="noopener noreferrer"
                >
                  Open the live comparison <span aria-hidden="true">↗</span>
                </a>
              </div>
            )}

            {pulse?.trendsSigns?.values && (() => {
              const ts = pulse.trendsSigns;
              const rows = SIGNS
                .map(s => ({ name: s.name, slug: s.asset.sign, v: ts.values[s.asset.sign] }))
                .filter(r => Number.isFinite(r.v));
              if (!rows.length) return null;
              const max = Math.max(...rows.map(r => r.v), 1);
              const tickPct = Math.min((1 / max) * 100, 100);
              return (
                <div className="pulse__block">
                  <div className="pulse__head">
                    <span className="label label--gold">Searching, sign by sign</span>
                    <span className="pulse__src">Google Trends · captured {ts.capturedAt} · “{ts.anchor}” = 1</span>
                  </div>
                  <div className="pulse__bars pulse__bars--terms">
                    {rows.map(r => (
                      <div className="pulse__bar" key={r.slug}>
                        <span className="pulse__bar-k">“{r.slug} horoscope”</span>
                        <span className="pulse__bar-track">
                          <span
                            className="pulse__bar-fill is-twelve"
                            style={{ width: Math.max((r.v / max) * 100, 2) + '%' }}
                          />
                          <span className="pulse__bar-tick" style={{ left: tickPct + '%' }} aria-hidden="true" />
                        </span>
                        <span className="pulse__bar-v">{r.v.toFixed(1)}×</span>
                      </div>
                    ))}
                  </div>
                  <p className="pulse__note">
                    Bare sign terms are ambiguous in English (cancer the
                    disease, gemini the model), so each bar measures the
                    explicit query, an undercount by design. Gold line:
                    “{ts.anchor}” search interest over the same twelve
                    months, set to 1.
                  </p>
                </div>
              );
            })()}

            {pulse?.estimates && (
              <div className="pulse__block">
                <div className="pulse__head">
                  <span className="label label--gold">Across the feeds · editorial estimates</span>
                  <span className="pulse__src">Estimates · {pulse.estimates.capturedAt}</span>
                </div>
                <p className="pulse__note pulse__note--lead">
                  Platform figures are editorial estimates from public
                  cumulative hashtag and search-volume data — directional,
                  not measured. Encyclopedia figures are measured.
                </p>
                <div className="pulse__grid pulse__grid--est">
                  {pulse.estimates.items.map(it => (
                    <div className="pulse__cell" key={it.k}>
                      <div className="pulse__k">{it.k} <span className="pulse__est">est.</span></div>
                      <div className="pulse__v">{it.v}</div>
                      <div className="pulse__sub">{it.unit}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <a className="pulse__more" href="/thesis/#pulse">
            <span>The full instrument — inside the thesis</span>
            <span className="pulse__more-arr" aria-hidden="true">→</span>
          </a>
        </section>
      );
    }

    // ---- Nº 06 · Market snapshot --------------------------------------------
    // Twelve lots in zodiac order. Two labeled layers, same honesty
    // contract as the Pulse: live DexScreener reads, and a weekly on-chain
    // distribution snapshot committed to the repository
    // (assets/distribution.json, refreshed by a scheduled action).
    function StandingsSection() {
      const reveal = useReveal();
      const hostRef = useRef(null);
      const [enabled, setEnabled] = useState(false);
      const [rows, setRows] = useState(null);
      const [failed, setFailed] = useState(false);
      const [dist, setDist] = useState(null);

      useEffect(() => {
        const el = hostRef.current;
        if (!el || enabled) return undefined;
        if (!('IntersectionObserver' in window)) { setEnabled(true); return undefined; }
        const io = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) { setEnabled(true); io.disconnect(); }
        }, { rootMargin: '240px 0px' });
        io.observe(el);
        return () => io.disconnect();
      }, [enabled]);

      useEffect(() => {
        if (!enabled) return;
        const mints = SIGNS
          .map((s) => s.representations.solana?.address)
          .filter(Boolean);
        fetch(`https://api.dexscreener.com/tokens/v1/solana/${mints.join(',')}`)
          .then((r) => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
          .then((payload) => {
            const pairs = Array.isArray(payload) ? payload : payload?.pairs;
            if (!Array.isArray(pairs)) throw new Error('shape');
            const best = new Map();
            for (const p of pairs) {
              const mint = p?.baseToken?.address;
              if (!mint) continue;
              const liq = toFiniteNumber(p?.liquidity?.usd) ?? 0;
              const prev = best.get(mint);
              if (!prev || liq > prev.liq) best.set(mint, { liq, pair: p });
            }
            setRows(SIGNS.map((s) => {
              const mint = s.representations.solana?.address;
              const pair = (mint && best.get(mint)?.pair) || null;
              return {
                sign: s,
                priceUsd: pair?.priceUsd ?? null,
                change24h: pair?.priceChange?.h24 ?? null,
                marketCap: toFiniteNumber(pair?.marketCap ?? pair?.fdv)
              };
            }));
          })
          .catch(() => setFailed(true));
        fetch('/assets/distribution.json')
          .then((r) => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
          .then(setDist)
          .catch(() => { /* the leaderboard stands without the snapshot */ });
      }, [enabled]);

      const marketRows = rows;
      const distFor = (slug) => dist?.signs?.[slug] || null;
      const pctShare = (value) => {
        const n = toFiniteNumber(value);
        return n === null
          ? '—'
          : `${n.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
      };

      return (
        <section ref={reveal} id="standings" className="sec reveal" aria-label="Market snapshot">
          <div className="sec__head">
            <span className="sec__no">Nº 06</span>
            <span className="line" />
            <h2 className="sec__title">Market snapshot</h2>
          </div>

          <h3 className="standings__statement">
            Shown in zodiac order. <span className="it">Markets fluctuate.</span>
          </h3>
          <p className="sec__lede">
            Twelve public records, observed across open markets. Prices are read
            live from DexScreener; token-account concentration is read from the
            chain and snapshotted weekly. Rows always follow zodiac order; the
            figures are context—not a measure of quality, safety, or a
            recommendation. Digital assets are speculative, may become illiquid,
            and can lose all market value. Operator and economic-interest
            statements remain pending confirmation; see the{' '}
            <a href="/disclosure/">Disclosure</a>.
          </p>

          <div ref={hostRef} className="standings" aria-busy={enabled && !marketRows && !failed}>
            {!marketRows && !failed && (
              <div className="standings__state">Reading the market…</div>
            )}
            {failed && !marketRows && (
              <div className="standings__state">
                Market data unavailable. The records stand in the <a href="#registry">registry</a>.
              </div>
            )}
            {marketRows && (
              <>
                <div className="standings__src">
                  Source: DexScreener · live
                  {dist ? ` · token-account snapshot ${dist.capturedAt}` : ''}
                </div>
                <div className="standings__scroll">
                  <table className="standings__table">
                    <thead>
                      <tr>
                        <th scope="col">Lot</th>
                        <th className="standings__th--r" scope="col">Price USD</th>
                        <th className="standings__th--r" scope="col">24H</th>
                        <th className="standings__th--r" scope="col">Market cap</th>
                        <th className="standings__th--r" scope="col">Top-10 share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketRows.map((row) => {
                        const slug = row.sign.asset.sign;
                        const d = distFor(slug);
                        const change = toFiniteNumber(row.change24h);
                        const changeClass = change === null
                          ? ''
                          : change > 0
                            ? ' market__change--up'
                            : change < 0
                              ? ' market__change--down'
                              : ' market__change--flat';
                        return (
                          <tr key={row.sign.ticker}>
                            <td className="standings__lot">
                              <a href={`/registry/${slug}/`}>
                                <picture className="standings__disc" aria-hidden="true">
                                  <source srcSet={`/assets/zodiac-icons/48/${slug}.avif`} type="image/avif" />
                                  <img
                                    src={`/assets/zodiac-icons/48/${slug}.webp`}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                    width="22"
                                    height="22"
                                  />
                                </picture>
                                <span className="standings__name">{row.sign.name}</span>
                                <span className="standings__tick">{row.sign.ticker}</span>
                              </a>
                            </td>
                            {row.marketCap === null && row.priceUsd === null ? (
                              <td className="standings__v standings__v--dim" colSpan="3">
                                Not indexed. The record stands regardless.
                              </td>
                            ) : (
                              <>
                                <td className="standings__v standings__v--mono">{formatPriceUsd(row.priceUsd)}</td>
                                <td className={`standings__v standings__v--mono${changeClass}`}>{formatPercent(row.change24h)}</td>
                                <td className="standings__v">{formatUsdCompact(row.marketCap)}</td>
                              </>
                            )}
                            <td className="standings__v standings__v--mono">{pctShare(d?.top10Pct)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="standings__note">
                  Rows remain in zodiac order. Market figures are read live and
                  may be delayed, incomplete, or wrong. Top-10 share is the
                  portion of on-chain supply held by the ten largest token
                  accounts, read from the Solana RPC
                  {dist ? ` and captured ${dist.capturedAt}` : ''}. The
                  largest accounts include DEX liquidity pools, so wallet
                  concentration is lower than the raw figure reads.
                </p>
              </>
            )}
          </div>
        </section>
      );
    }

    // ---- Shelf viewer (read-only public lookup) ----------------------------
    // Reads native Solana holdings through the same minimized, same-origin
    // endpoint as Registry Collection. The browser never sends an address directly
    // to a public RPC or requests unrelated token accounts.
    const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    const ZODIAC_SOLANA_MINTS = new Map(
      SIGNS
        .filter((s) => s.representations.solana && s.representations.solana.address)
        .map((s) => [s.representations.solana.address, s])
    );
    const SHELF_CACHE = new Map();
    const ZODIAC_BY_SLUG = new Map(SIGNS.map((sign) => [sign.asset.sign, sign]));

    function shortAddress(value) {
      const s = String(value || '');
      return s.length > 12 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s;
    }

    async function fetchShelfHoldings(owner) {
      if (SHELF_CACHE.has(owner)) return SHELF_CACHE.get(owner);
      const request = (async () => {
        const res = await fetch('/api/aura-holdings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: owner })
        });
        const payload = await res.json().catch(() => null);
        if (res.status === 429) {
          const err = new Error('rate-limited');
          err.kind = 'rate';
          throw err;
        }
        if (!res.ok) {
          const err = new Error(`Shelf lookup failed (${res.status})`);
          if (payload?.error === 'invalid_address') err.kind = 'invalid';
          throw err;
        }
        if (payload?.chain !== 'solana'
          || !Array.isArray(payload.heldSigns)
          || !Number.isFinite(Date.parse(payload.checkedAt))) {
          throw new Error('Incomplete Shelf response');
        }
        const held = [];
        const seen = new Set();
        for (const slug of payload.heldSigns) {
          const sign = typeof slug === 'string' ? ZODIAC_BY_SLUG.get(slug) : null;
          if (!sign || seen.has(slug)) throw new Error('Incomplete Shelf response');
          seen.add(slug);
          held.push({ sign });
        }
        const canonical = [...held].sort((a, b) => a.sign.order - b.sign.order);
        if (canonical.some((entry, index) => entry !== held[index])) {
          throw new Error('Incomplete Shelf response');
        }
        return canonical;
      })();
      SHELF_CACHE.set(owner, request);
      try {
        return await request;
      } catch (err) {
        SHELF_CACHE.delete(owner);
        throw err;
      }
    }

    function shelfComposition(held) {
      const counts = new Map();
      for (const h of held) {
        counts.set(h.sign.element, (counts.get(h.sign.element) || 0) + 1);
      }
      const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      if (ranked.length === 1) return `${ranked[0][0]} only`;
      if (ranked.length === 4 && ranked[0][1] === ranked[3][1]) return 'All four elements, balanced';
      return `${ranked[0][0]} and ${ranked[1][0].toLowerCase()} dominant`;
    }

    const SHELF_EXAMPLE_FACTS = [
      { k: 'Shelf', v: '4 illustrative Registry signs' },
      { k: 'Composition', v: 'Fire and water dominant' },
      { k: 'Season', v: 'Current season represented' },
      { k: 'Provenance', v: 'Native on Solana · bridged to Base' }
    ];

    function ShelfViewer() {
      const [input, setInput] = useState('');
      const [view, setView] = useState({ state: 'idle' });
      const lookupSeq = useRef(0);
      const season = useMemo(() => currentSeason(), []);

      const onSubmit = async (e) => {
        e.preventDefault();
        const address = input.trim();
        if (!address || view.state === 'loading') return;
        if (ZODIAC_SOLANA_MINTS.has(address) || lookupAddress(address)) {
          setView({ state: 'mint-hint' });
          return;
        }
        if (!SOLANA_ADDRESS_RE.test(address)) {
          setView({ state: 'invalid' });
          return;
        }
        const seq = ++lookupSeq.current;
        setView({ state: 'loading' });
        try {
          const held = await fetchShelfHoldings(address);
          if (seq !== lookupSeq.current) return;
          setView(held.length
            ? { state: 'holds', address, held }
            : { state: 'empty', address });
        } catch (err) {
          if (seq !== lookupSeq.current) return;
          if (err.kind === 'invalid') setView({ state: 'invalid' });
          else if (err.kind === 'rate') setView({ state: 'rate' });
          else setView({ state: 'error' });
        }
      };

      const onClear = () => {
        lookupSeq.current += 1;
        setInput('');
        setView({ state: 'idle' });
      };

      const live = view.state === 'holds' || view.state === 'empty';
      const loading = view.state === 'loading';

      const hint = {
        invalid: 'Not a valid Solana address.',
        'mint-hint': null, // rendered with a link below
        rate: 'The public lookup is busy right now. Try again in a moment.',
        error: 'Shelf lookup is unavailable right now. The example view stands in.'
      }[view.state];

      let liveFacts = null;
      if (view.state === 'holds') {
        const seasonHeld = season
          ? view.held.some((h) => h.sign.name === season.sign.name)
          : false;
        liveFacts = [
          { k: 'Shelf', v: `${view.held.length} Registry ${view.held.length === 1 ? 'sign' : 'signs'} found` },
          { k: 'Composition', v: shelfComposition(view.held) },
          {
            k: 'Season',
            v: season
              ? `${season.sign.name} season ${seasonHeld ? 'represented' : 'not represented'}`
              : 'Season unavailable'
          },
          { k: 'Address', v: shortAddress(view.address) }
        ];
      }

      return (
        <div className="idctx__example">
          <div className="idctx__example-head">
            <div className="idctx__example-title">Public Zodiacs shelf</div>
            <div className="idctx__example-sub">
              {live ? 'Live · read-only' : 'Example view'}
            </div>
          </div>

          {REGISTRY_AURA_ENABLED ? <form className="shelf__form" onSubmit={onSubmit}>
            <label className="shelf__label" htmlFor="shelf-input">
              View a public shelf
            </label>
            <div className="shelf__row">
              <input
                id="shelf-input"
                className="shelf__input mono"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="Paste a Solana wallet address"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button type="submit" className="shelf__submit" disabled={loading}>
                {loading ? 'Reading' : 'View'}
              </button>
            </div>
            <p className="shelf__hint">
              On View, Zodiacs.org sends this public address to the configured
              blockchain-data provider to check only the twelve Registry mints.
              Public addresses and request metadata may be linkable. No chart or
              birth data is sent. <a href="/privacy/">Privacy</a>
            </p>
            {hint && <p className="shelf__hint">{hint}</p>}
            {view.state === 'mint-hint' && (
              <p className="shelf__hint">
                That is an official Zodiac record, not a wallet. To check a
                token address, use <a href="#verify">Verify</a> above.
              </p>
            )}
            {live && (
              <p className="shelf__hint">
                <button type="button" className="shelf__clear" onClick={onClear}>
                  Back to the example view
                </button>
              </p>
            )}
          </form> : (
            <p className="shelf__hint">
              Live lookup is paused while Registry Collection is off. The illustrative
              shelf below makes no address or provider request.
            </p>
          )}

          <div role="status" aria-live="polite">
            {loading && (
              <div className="shelf__skel" aria-label="Reading shelf">
                {[0, 1, 2, 3].map((i) => (
                  <div className="shelf__skel-cell" key={i}>
                    <div className="shelf__skel-bar" />
                    <div className="shelf__skel-bar" />
                  </div>
                ))}
              </div>
            )}

            {view.state === 'holds' && (
              <>
                <div className="shelf__signs">
                  {view.held.map((h) => (
                    <a
                      className="shelf__sign"
                      key={h.sign.name}
                      href={`/registry/${h.sign.name.toLowerCase()}/`}
                    >
                      <img
                        src={`/assets/icons/${h.sign.name.toLowerCase()}.png`}
                        alt=""
                        loading="lazy"
                        width="26"
                        height="26"
                      />
                      <span className="shelf__sign-name">{h.sign.name}</span>
                      <span className="shelf__sign-amt">Found</span>
                    </a>
                  ))}
                </div>
                <div className="idctx__receipt">
                  {liveFacts.map((fact) => (
                    <div className="idctx__fact" key={fact.k}>
                      <div className="idctx__fact-k">{fact.k}</div>
                      <div className="idctx__fact-v">{fact.v}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {view.state === 'empty' && (
              <div className="shelf__empty">
                <p className="shelf__empty-line">No Registry-listed Zodiac was found at this address.</p>
                <p className="shelf__empty-sub">
                  The illustrative example remains available. No purchase is required.
                </p>
              </div>
            )}

            {!live && !loading && (
              <div className="idctx__receipt">
                {SHELF_EXAMPLE_FACTS.map((fact) => (
                  <div className="idctx__fact" key={fact.k}>
                    <div className="idctx__fact-k">{fact.k}</div>
                    <div className="idctx__fact-v">{fact.v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="idctx__note">
            {live
              ? 'One public Solana address was checked through the Zodiacs.org holdings endpoint. No chart or birth data was sent. Bridged Base representations are not included in this view.'
              : 'The SDK provides computed symbolic context and public-address holdings state. The interface chooses how to present it.'}
          </p>
        </div>
      );
    }

    function IdentityContextSection() {
      const reveal = useReveal();
      const cards = [
        {
          t: 'Verify a Zodiac',
          d: 'Check whether a public address contains an official Registry-listed Zodiac on Solana or Base. A match is not proof of identity, control, or legal ownership.'
        },
        {
          t: 'Read a collection',
          d: 'See the element mix, modality mix, wheel coverage, and seasonal pattern formed by the signs at one public address.'
        },
        {
          t: 'Build with the record',
          d: 'Use verified Registry facts in profiles, receipts, seasonal moments, verifiers, and other products.'
        },
        ...(REGISTRY_AURA_ENABLED ? [{
          kind: 'aura',
          t: REGISTRY_AURA_ENTRY_COPY.title,
          d: REGISTRY_AURA_ENTRY_COPY.description,
          href: REGISTRY_AURA_PATH,
          link: REGISTRY_AURA_ENTRY_COPY.link,
        }] : []),
      ];
      return (
        <section ref={reveal} id="identity" className="sec idctx reveal" aria-label="Identity Context">
          <div className="sec__head">
            <span className="sec__no">Nº 07</span>
            <span className="line" />
            <span className="sec__title">Identity Context</span>
          </div>

          <h2 className="idctx__statement">
            What the registry <span className="it">can do.</span>
          </h2>

          <p className="idctx__copy">
            Verify a Zodiac, read the pattern in a public collection, or carry
            Registry facts into another product. Add a saved birth chart later
            if you want one.
          </p>

          <div className="idctx__grid">
            {cards.map((card, i) => card.kind === 'aura' ? (
              <article className="idctx__card idctx__card--aura" key={card.t} data-registry-collection-entry>
                <div className="idctx__aura-intro">
                  <span className="idctx__num">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="idctx__card-title">{card.t}</h3>
                  <p className="idctx__card-copy">{card.d}</p>
                </div>
                <div className="idctx__aura-action">
                  <div className="idctx__aura-flow" aria-label="Public collection, optional saved chart, and today’s sky">
                    <span className="idctx__aura-step"><span aria-hidden="true">01</span>Public collection</span>
                    <span className="idctx__aura-arrow" aria-hidden="true">→</span>
                    <span className="idctx__aura-step"><span aria-hidden="true">02</span>Chart (optional)</span>
                    <span className="idctx__aura-arrow" aria-hidden="true">→</span>
                    <span className="idctx__aura-step"><span aria-hidden="true">03</span>Today’s sky</span>
                  </div>
                  <a className="idctx__card-link idctx__aura-link" href={card.href} onClick={() => trackAnalytics('aura_entry', { source: 'registry' })}>
                    <span>{card.link}</span>
                  </a>
                </div>
              </article>
            ) : (
              <article className="idctx__card" key={card.t}>
                <span className="idctx__num">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="idctx__card-title">{card.t}</h3>
                <p className="idctx__card-copy">{card.d}</p>
              </article>
            ))}
          </div>

          <ShelfViewer />
        </section>
      );
    }

    const ACCESS_PRIMARY = [
      { name: 'Coinbase DEX', tag: 'Base onchain venue',  logo: '/assets/venues/coinbase.svg', url: 'https://wallet.coinbase.com/' },
      { name: 'Jupiter',      tag: 'Solana aggregator',   logo: '/assets/venues/jupiter.svg',  url: 'https://jup.ag/' },
      { name: 'fomo',         tag: 'Consumer onchain app', logo: '/assets/venues/fomo.svg',    url: 'https://fomo.family/' },
    ];
    const ACCESS_RAIL = [
      { name: 'OKX Wallet',     tag: 'Wallet interface',      logo: '/assets/venues/okx-wallet.svg',     url: 'https://web3.okx.com/' },
      { name: 'Binance Wallet', tag: 'Onchain token access',  logo: '/assets/venues/binance-wallet.svg', url: 'https://www.binance.com/en/web3wallet' },
      { name: 'Bybit Web3',     tag: 'Web3 interface',        logo: '/assets/venues/bybit-web3.svg',     url: 'https://www.bybit.com/web3/' },
      { name: 'Phantom',        tag: 'Solana wallet',         logo: '/assets/venues/phantom.svg',        url: 'https://phantom.com/' },
      { name: 'Solflare',       tag: 'Solana wallet',         logo: '/assets/venues/solflare.svg',       url: 'https://www.solflare.com/' },
      { name: 'Raydium',        tag: 'Solana onchain venue',  logo: '/assets/venues/raydium.svg',        url: 'https://raydium.io/' },
      { name: 'Orca',           tag: 'Solana onchain venue',  logo: '/assets/venues/orca.svg',           url: 'https://www.orca.so/' },
    ];

    /* Renders a venue logo if the SVG file exists; renders nothing if
       the file is missing (graceful no-op until brand assets are added). */
    function VenueLogo({ src }) {
      const [failed, setFailed] = useState(false);
      if (!src || failed) return null;
      return <img src={src} alt="" onError={() => setFailed(true)} loading="lazy" decoding="async" />;
    }

    function OnchainAccessSection() {
      const reveal = useReveal();
      return (
        <section ref={reveal} id="onchain-access" className="sec access reveal" aria-label="Onchain access">
          <div className="sec__head">
            <span className="sec__no">Nº 08</span>
            <span className="line" />
            <span className="sec__title">Onchain access</span>
          </div>

          <h2 className="access__statement">
            Independent routes across<br/>
            <span className="it">third-party onchain services.</span>
          </h2>

          <p className="access__copy">
            These links open independent Solana, Base, and wallet services;
            they are not endorsements or recommendations, and Zodiacs.org does
            not sell or execute transactions. A service may request a wallet
            connection, token approval, signature, and an onchain transaction
            that cannot be reversed. Digital assets are speculative, may become
            illiquid, and can lose all market value. You could lose all money
            used to acquire a Zodiac. Verify the official mint, network, amount,
            and destination before continuing. Operator and economic-interest
            statements remain pending confirmation; see the{' '}
            <a href="/disclosure/">Disclosure</a>.
          </p>

          <div className="access__primary" role="list">
            {ACCESS_PRIMARY.map(v => (
              <a className="access__card access__card--featured" role="listitem" key={v.name}
                 href={v.url} rel="noopener noreferrer external nofollow">
                <div className="access__logo" aria-hidden="true">
                  <VenueLogo src={v.logo} />
                </div>
                <div className="access__name">{v.name}</div>
                <div className="access__tag">{v.tag}</div>
              </a>
            ))}
          </div>

          <div className="access__rail-wrap" aria-label="More onchain venues">
            <div className="access__rail" role="list">
              {ACCESS_RAIL.map(v => (
                <a className="access__card access__card--rail" role="listitem" key={v.name}
                   href={v.url} rel="noopener noreferrer external nofollow">
                  <div className="access__logo" aria-hidden="true">
                    <VenueLogo src={v.logo} />
                  </div>
                  <div className="access__name">{v.name}</div>
                  <div className="access__tag">{v.tag}</div>
                </a>
              ))}
            </div>
          </div>

          <p className="access__note">
            Official mint addresses should always be verified through the
            Zodiacs.org <a className="access__note-link" href="#registry">registry</a> and{' '}
            <a className="access__note-link" href="#sdk">SDK</a>.
          </p>

          <div className="access__cta">
            <a className="btn btn--primary" href="#verify">
              <span>Verify official addresses</span>
              <span className="arr">→</span>
            </a>
            <a className="btn btn--ghost" href="#sdk">
              <span>View SDK</span>
              <span className="arr" style={{ width: 28, height: 28, background: 'transparent', border: 0, color: 'var(--ink-dim)' }}>↗</span>
            </a>
          </div>
        </section>
      );
    }

    function ForBuildersSection() {
      const reveal = useReveal();
      const capabilities = [
        'Official asset verification',
        'Native and bridged mappings',
        'Public Zodiac Shelves',
        'Public-record receipts',
        'Zodiac wheel views',
        'Birth chart overlays',
        'Wallet integrations',
        'Gallery integrations',
        'Public profiles',
        'Share cards',
        'Address-held context',
        'Seasonal context'
      ];

      return (
        <section ref={reveal} id="builders-overview" className="sec builders reveal" aria-label="For Builders">
          <div className="sec__head">
            <span className="sec__no">Nº 09</span>
            <span className="line" />
            <span className="sec__title">For Builders</span>
          </div>

          <h2 className="builders__statement">
            Infrastructure<br/>
            <span className="it">with a symbolic surface.</span>
          </h2>

          <p className="builders__copy">
            Zodiacs are not only a collection of assets. They are a verified
            symbolic layer that can extend into astrology products, wallets,
            galleries, profiles, share cards, and read-only public-record
            experiences.
          </p>

          <div className="builders__capabilities" aria-label="Builder capabilities">
            {capabilities.map((capability, i) => (
              <div className="builders__cap" key={capability}>
                <span className="builders__cap-k">{String(i + 1).padStart(2, '0')}</span>
                <span className="builders__cap-v">{capability}</span>
              </div>
            ))}
          </div>

          <a className="btn btn--primary builders__cta" href="/sdk/">
            <span>Explore the SDK</span>
            <span className="arr">→</span>
          </a>
        </section>
      );
    }

    function BuiltWithZodiacsSection() {
      const reveal = useReveal();
      const examples = [
        {
          t: 'Astrology apps',
          d: 'Use verified signs as a public layer beside charts, seasons, and symbolic profiles.'
        },
        {
          t: 'Horoscope products',
          d: 'Anchor seasonal and sign-aware experiences in the official registry.'
        },
        {
          t: 'Wallet experiences',
          d: 'Show native Solana holdings and official Base representations with clear provenance.'
        },
        {
          t: 'Gallery experiences',
          d: 'Arrange the Twelve as cultural assets, collections, shelves, and shareable rooms.'
        },
        {
          t: 'Profile systems',
          d: 'Turn public-address records into badges, wheel coverage, composition, and identity surfaces.'
        },
        {
          t: 'Identity layers',
          d: 'Give downstream interfaces a shared symbolic record to build around.'
        },
        {
          t: 'Social moments',
          d: 'Create public-record receipts, seasonal cards, and lightweight public displays.'
        },
        {
          t: 'AI astrology assistants',
          d: 'Ground symbolic interfaces in verified facts instead of loose address lists.'
        }
      ];

      return (
        <section ref={reveal} id="built-with-zodiacs" className="sec built reveal" aria-label="Built With Zodiacs">
          <div className="sec__head">
            <span className="sec__no">Nº 10</span>
            <span className="line" />
            <h2 className="sec__title">Built With Zodiacs</h2>
          </div>

          <p className="built__intro">
            The registry is the visible surface. Beneath it is a small ecosystem
            layer for the products people already want to make around symbolic
            identity.
          </p>

          <div className="built__grid">
            {examples.map((example, i) => (
              <article className="built__item" key={example.t}>
                <span className="built__k">Use case {String(i + 1).padStart(2, '0')}</span>
                <h3 className="built__title">{example.t}</h3>
                <p className="built__copy">{example.d}</p>
              </article>
            ))}
          </div>
        </section>
      );
    }

    function CodeBlock({ label, code }) {
      const [copied, setCopied] = useState(false);
      const onCopy = useCallback(() => {
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          });
        }
      }, [code]);
      return (
        <div className="code">
          <div className="code__bar">
            <span className="code__dots" aria-hidden="true">
              <i /><i /><i />
            </span>
            <span className="code__label">{label}</span>
            <button
              type="button"
              className={'code__copy' + (copied ? ' is-copied' : '')}
              onClick={onCopy}
              aria-label="Copy code"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="code__pre"><code>{code}</code></pre>
        </div>
      );
    }

    function SdkSection() {
      const reveal = useReveal();
      const caps = [
        { t: 'Verify', d: 'Recognize official Zodiacs.org representations across Solana and Base.' },
        { t: 'Read', d: 'Read public-address holdings state without custody, signing, or transactions.' },
        { t: 'Compose', d: 'Shape held signs into seasonal context, wheel coverage, and identity surfaces.' },
      ];
      return (
        <section ref={reveal} id="sdk" className="sec reveal" aria-label="SDK">
          <div className="sec__head">
            <span className="sec__no">Nº 12</span>
            <span className="line" />
            <h2 className="sec__title">SDK</h2>
          </div>
          <p className="sec__lede">
            The SDK is the public interface to the same registry shown here.
            It gives apps verified facts for recognition, address-record display,
            and symbolic identity context.
          </p>

          <div className="sdk__caps">
            {caps.map((c, i) => (
              <div className="sdk__cap" key={i}>
                <div className="sdk__cap-t">{c.t}</div>
                <div className="sdk__cap-d">{c.d}</div>
              </div>
            ))}
          </div>

          <CodeBlock label="install" code="npm i @zodiacs/sdk" />

          <div className="sdk__icons" role="group" aria-label="Official sign icons, shipped with the SDK">
            {SIGNS.map(s => (
              <a
                key={s.ticker}
                className="sdk__icons-item"
                href={`/registry/${s.asset.sign}/`}
                title={`${s.name} — catalogue entry`}
                aria-label={`${s.name} — catalogue entry`}
              >
                <img
                  src={`/assets/sdk/zodiac-icons/circle/${s.asset.sign}.png`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </a>
            ))}
            <span className="sdk__icons-note">Official icon assets · all twelve · shipped with the SDK</span>
          </div>

          <div className="res">
            <a className="res__item" href="/sdk/">
              <span className="res__k">Page</span>
              <span className="res__v">Explore the SDK</span>
              <span className="res__arr" aria-hidden="true">↗</span>
            </a>
            <a className="res__item" href="https://www.npmjs.com/package/@zodiacs/sdk" rel="noopener noreferrer">
              <span className="res__k">npm</span>
              <span className="res__v">@zodiacs/sdk</span>
              <span className="res__arr" aria-hidden="true">↗</span>
            </a>
            <a className="res__item" href="https://github.com/ZodiacsOfficial/sdk" rel="noopener noreferrer">
              <span className="res__k">GitHub</span>
              <span className="res__v">ZodiacsOfficial/sdk</span>
              <span className="res__arr" aria-hidden="true">↗</span>
            </a>
            <a className="res__item" href="/registry/zodiacs.registry.json">
              <span className="res__k">Record</span>
              <span className="res__v">Public record</span>
              <span className="res__arr" aria-hidden="true">↗</span>
            </a>
            <a className="res__item" href="/sdk/#examples">
              <span className="res__k">Docs</span>
              <span className="res__v">Guides &amp; reference</span>
              <span className="res__arr" aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
      );
    }

    function SecuritySection() {
      const reveal = useReveal();
      const nots = ['No private keys', 'No custody', 'No signing', 'No swaps', 'No approvals', 'No transactions'];
      return (
        <section ref={reveal} id="security" className="sec reveal" aria-label="Read-only by design">
          <div className="sec__head">
            <span className="sec__no">Nº 13</span>
            <span className="line" />
            <h2 className="sec__title">Read-only by design</h2>
          </div>
          <p className="sec__statement">
            The Registry, Registry Collection, and SDK lookup/display tools are made
            for recognition and display. They read public information but do
            not request signatures, approvals, swaps, network changes, or
            transactions, and they cannot hold or move assets. Wallets, market
            services, and trading venues reached through outbound links are
            independent third parties and may request those actions under their
            own terms. Never share a seed phrase or private key.
          </p>
          <p className="sec__disclosure">
            &ldquo;Official&rdquo; means that an asset address appears in this Registry. It
            is not government, regulator, wallet, or exchange approval, and it
            does not prove identity, control, legal ownership, safety, value,
            liquidity, or future performance.
          </p>
          <div className="ro__grid">
            {nots.map((n, i) => (
              <div className="ro__item" key={i}>
                <span className="ro__mark" aria-hidden="true">—</span>
                <span>{n}</span>
              </div>
            ))}
          </div>
        </section>
      );
    }

    const FAQ_GROUPS = [
      {
        label: 'The Registry',
        items: [
          { q: 'What is Zodiacs.org?',
            a: 'The official public registry for the twelve Zodiacs: their identities, records, origin, and verified representations.' },
          { q: 'What can I do here?',
            a: 'Explore the Twelve, verify an address against the registry, inspect the public record, and see how address holdings can become symbolic context.' },
          { q: 'What can be built with Zodiacs?',
            a: 'Profiles, galleries, wallet views, Zodiac shelves, public-record receipts, zodiac wheel views, seasonal moments, and astrology-native interfaces.' },
          { q: 'Where does Astrofolio fit?',
            a: 'Astrofolio is a related consumer experience around personal Zodiac shelves and symbolic holdings. Zodiacs.org remains the official registry and SDK source of truth.' },
          { q: 'What does the SDK add?',
            a: 'It gives apps a read-only way to recognize official Zodiacs, show records, read public-address holdings, and compute display-ready symbolic context.' },
          { q: 'Why Solana and Base?',
            a: 'The original Zodiacs live on Solana. The Base records are official bridged counterparts that point back to those Solana origins.' }
        ]
      },
      {
        label: 'Acquisition & Ownership',
        items: [
          { q: 'How do I acquire a Zodiac?',
            a: 'Each sign’s catalogue page links to independent third-party services, including Jupiter with the official Solana mint preloaded. Zodiacs.org does not sell, execute, or recommend a transaction. A service may request a wallet connection, token approval, signature, and an onchain transaction that cannot be reversed. Verify the mint, network, amount, and destination before continuing.' },
          { q: 'Do I need a special wallet?',
            a: 'Any wallet that holds SPL tokens on Solana or ERC-20 tokens on Base will do. The registry is wallet-neutral; the Onchain Access section lists familiar interfaces.' },
          { q: 'Does the registry prove presale or allocation history?',
            a: 'No. The registry verifies official addresses and provenance; it does not independently establish presale, allocation, or trading-history claims.' }
        ]
      },
      {
        label: 'Legitimacy & Trust',
        items: [
          { q: 'How do I know an address is official?',
            a: <>Check it against the record. The verifier recognizes exactly twenty-four addresses: twelve native Solana mints and twelve bridged Base representations. Anything else is reported as {REGISTRY_VERIFIER_NOT_FOUND_INLINE}. The same addresses are mirrored in the public SDK repository and match the mints Astrofolio&rsquo;s own app routes to, and the Libra record was corroborated character for character in public view, in the events preserved in <a href="/archive/#accidental-libra">the archive</a>.</> },
          { q: 'Other tokens use the same names. Which is real?',
            a: 'Names and tickers can be copied; addresses cannot. Only the addresses in the registry are official records. When in doubt, verify the address itself, never the ticker.' },
          { q: 'Is this related to the LIBRA token from the news?',
            a: <>No. In early 2025 an unrelated token of that name collapsed in public view, and buyers went looking for the real one. The official Libra record predates that episode and sits in the registry. The full story is preserved in <a href="/archive/#accidental-libra">the archive</a>.</> },
          { q: 'What if an address is not listed?',
            a: <>The verifier reports that it was {REGISTRY_VERIFIER_NOT_FOUND_INLINE}.</> }
        ]
      },
      {
        label: 'Astrology & Culture',
        items: [
          { q: 'Why put the zodiac onchain?',
            a: 'The twelve signs are a symbolic language in continuous use for more than two thousand years, an identity system older than most institutions that issue identity. The registry gives each sign one durable public record.' },
          { q: 'Do I have to believe in astrology?',
            a: 'No. The signs function as cultural symbols whether or not the stars are consulted. The registry records assets and provenance, not doctrine.' },
          { q: 'Can I only hold my own sign?',
            a: 'Anyone may hold any sign, in any combination. Many begin with their sun sign; collectors assemble elements, seasons, or the full wheel.' },
          { q: 'Does Zodiacs claim ownership of astrology?',
            a: 'No. Zodiacs keeps the register for these twelve assets. It makes no claim over astrology, the signs, or their symbols.' }
        ]
      },
      {
        label: 'Risk & Posture',
        items: [
          { q: 'Does this site recommend Zodiacs as an investment?',
            a: 'No. Nothing on this site promises profit or recommends buying, selling, or holding a Zodiac. Market data and third-party access links are informational and can be delayed, incomplete, or wrong.' },
          { q: 'What are the risks?',
            a: 'Prices can be volatile, liquidity can be limited or disappear, and a Zodiac can lose all market value. You could lose all money used to acquire one. Wallet loss, scams, contract bugs, bridge failures, and user mistakes can cause permanent loss. Onchain transactions generally cannot be reversed.' },
          { q: 'What happens if this site goes away?',
            a: 'Nothing happens to the assets. They live onchain. The registry file is mirrored in the SDK package and the public repository, so the record outlives any single page.' },
          { q: 'Does the site or SDK move assets?',
            a: 'No. The Registry and SDK do not request asset transfers, signatures, approvals, or transactions.' },
          { q: 'What is Market Context?',
            a: 'Optional third-party data from Dex Screener. It is not a valuation or recommendation, may be delayed, incomplete, unavailable, or wrong, and is secondary to identity, registry, and verification.' }
        ]
      }
    ];

    function FaqSection() {
      const reveal = useReveal();
      return (
        <section ref={reveal} id="faq" className="sec reveal" aria-label="Questions">
          <div className="sec__head">
            <span className="sec__no">Nº 14</span>
            <span className="line" />
            <h2 className="sec__title">Questions</h2>
          </div>
          {FAQ_GROUPS.map((group) => (
            <div className="faq__group" key={group.label}>
              <h3 className="faq__group-label">{group.label}</h3>
              <dl className="faq">
                {group.items.map((item) => (
                  <div className="faq__item" key={item.q}>
                    <dt className="faq__q">{item.q}</dt>
                    <dd className="faq__a">{item.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </section>
      );
    }

    function TokenQuote({ sign }) {
      const [ref, inView] = useInView();
      const batch = useTwelveQuotes(inView);
      // If the one batch call fails, the focused sign still tries its own
      // pinned pair before the panel settles for "unavailable".
      const { state: single } = useMarketContext(sign, inView && batch.status === 'unavailable');
      const quote = batch.status === 'ok'
        ? batch.quotes[sign.asset.sign]
        : single.status === 'ok' ? single.pair : null;
      const settled = batch.status === 'ok'
        || (batch.status === 'unavailable' && single.status !== 'loading' && single.status !== 'idle');
      const changeClass = marketChangeClass(quote?.priceChange24h);
      return (
        <p ref={ref} className="consumer-preview__quote" data-token-quote={sign.asset.sign}>
          {quote ? (
            <>
              <span className="consumer-quote__price">{formatPriceUsd(quote.priceUsd)}</span>
              <span className={'consumer-quote__change' + changeClass}>{formatPercent(quote.priceChange24h)}</span>
              <span className="consumer-quote__label">Live price · 24h change</span>
            </>
          ) : !settled ? (
            <span className="consumer-quote__state">Reading the market…</span>
          ) : batch.status === 'ok' ? (
            <span className="consumer-quote__state">Not indexed. The record stands regardless.</span>
          ) : (
            <span className="consumer-quote__state">Market data unavailable. The record stands in the Registry.</span>
          )}
        </p>
      );
    }

    function ConsumerTokensSection() {
      const reveal = useReveal();
      const [hostRef, inView] = useInView('240px 0px 240px 0px');
      const batch = useTwelveQuotes(inView);
      return (
        <section ref={reveal} id="tokens" className="consumer-tokens reveal" aria-labelledby="consumer-tokens-title">
          <header className="consumer-section-head">
            <span className="consumer-section-head__eyebrow">Live market</span>
            <h2 id="consumer-tokens-title">Twelve tokens, live.</h2>
            <p>
              Prices read live from the open market, in zodiac order.
              Open any sign to see its record and where it trades.
            </p>
          </header>
          <ol ref={hostRef} className="consumer-tokens__list">
            {SIGNS.map((item) => {
              const quote = batch.status === 'ok' ? batch.quotes[item.asset.sign] : null;
              const changeClass = marketChangeClass(quote?.priceChange24h);
              return (
                <li key={item.ticker}>
                  <a className="consumer-token" href={registryProfilePath(item)}>
                    <img
                      src={`/assets/zodiac-icons/48/${item.asset.sign}.webp`}
                      width="32"
                      height="32"
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="consumer-token__id">
                      <span className="consumer-token__row">
                        <span className="consumer-token__name">{item.name}</span>
                        <span className="consumer-token__ticker">{item.ticker}</span>
                      </span>
                      <span className="consumer-token__dates">{signDateLabel(item)}</span>
                    </span>
                    {quote ? (
                      <span className="consumer-token__quote">
                        <span className="consumer-token__price">{formatPriceUsd(quote.priceUsd)}</span>
                        <span className={'consumer-token__change' + changeClass}>{formatPercent(quote.priceChange24h)}</span>
                      </span>
                    ) : (
                      <span className="consumer-token__quote consumer-token__quote--quiet">
                        {batch.status === 'ok' ? 'Not indexed' : batch.status === 'unavailable' ? '—' : '…'}
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ol>
          <p className="consumer-tokens__foot">
            Prices are read live from DexScreener — independent third-party data, not a
            valuation or recommendation. A Zodiac can lose all market value. Full addresses
            live on each record and in the <a href="/registry/zodiacs.registry.json">public Registry JSON</a>.
            See the <a href="/disclosure/">Disclosure</a>.
          </p>
        </section>
      );
    }

    function SeasonPulse({ season }) {
      const [ref, inView] = useInView();
      const batch = useTwelveQuotes(inView);
      const quote = batch.status === 'ok' ? batch.quotes[season.sign.asset.sign] : null;
      const changeClass = marketChangeClass(quote?.priceChange24h);
      return (
        <p ref={ref} className="consumer-season" data-season-pulse={season.sign.asset.sign}>
          <img
            src={`/assets/zodiac-icons/48/${season.sign.asset.sign}.webp`}
            width="20"
            height="20"
            alt=""
            decoding="async"
          />
          <span className="consumer-season__name">{season.sign.name} season</span>
          <span className="consumer-season__sep" aria-hidden="true">·</span>
          <span>Day {season.day} of {season.total}</span>
          {quote && (
            <>
              <span className="consumer-season__sep" aria-hidden="true">·</span>
              <span className="consumer-season__quote">
                <span className="consumer-season__ticker">{season.sign.ticker}</span>
                {' '}{formatPriceUsd(quote.priceUsd)}
                <span className={'consumer-season__change' + changeClass}>{formatPercent(quote.priceChange24h)}</span>
                today
              </span>
            </>
          )}
        </p>
      );
    }

    function ConsumerExplorer({ active, setActive, sign }) {
      const reveal = useReveal();
      const gridRef = useRef(null);
      // The sculpture stage is the desktop selector wherever WebGL is
      // live; phones, tablets, and no-WebGL machines keep the pastel
      // grid and never pay for the scene bundle.
      const [stageMode, setStageMode] = useState(
        () => GALLERY_LIVE && window.matchMedia('(min-width: 1021px)').matches
      );
      useEffect(() => {
        if (!GALLERY_LIVE) return undefined;
        const query = window.matchMedia('(min-width: 1021px)');
        const onChange = () => setStageMode(query.matches);
        query.addEventListener?.('change', onChange);
        return () => query.removeEventListener?.('change', onChange);
      }, []);
      const season = useMemo(() => currentSeason(), []);
      const activeIndex = Math.max(0, SIGNS.findIndex(item => item.ticker === active));

      const chooseIndex = (index, focus = false) => {
        const wrapped = ((index % SIGNS.length) + SIGNS.length) % SIGNS.length;
        const next = SIGNS[wrapped];
        if (!next) return;
        if (focus) {
          gridRef.current
            ?.querySelector(`[data-consumer-sign="${next.asset.sign}"]`)
            ?.focus({ preventScroll: true });
        }
        setActive(next.ticker);
        trackAnalytics('registry_sign_selected', { sign: next.asset.sign, source: 'consumer_explorer' });
      };

      const onKeyDown = (event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const gridStyle = gridRef.current ? window.getComputedStyle(gridRef.current) : null;
        const columnCount = gridStyle?.display === 'grid'
          ? Math.max(1, gridStyle.gridTemplateColumns.split(/\s+/).filter(Boolean).length)
          : 1;
        const moves = {
          ArrowRight: activeIndex + 1,
          ArrowLeft: activeIndex - 1,
          ArrowDown: activeIndex + columnCount,
          ArrowUp: activeIndex - columnCount,
          Home: 0,
          End: SIGNS.length - 1
        };
        if (!(event.key in moves)) return;
        event.preventDefault();
        chooseIndex(moves[event.key], true);
      };

      return (
        <section
          ref={reveal}
          id="official-twelve"
          className="consumer-explorer"
          aria-labelledby="consumer-explorer-title"
          style={{ '--active-sign': sign.hue }}
        >
          <header className="consumer-explorer__head">
            <span className="consumer-section-head__eyebrow">The official twelve</span>
            <h2 id="consumer-explorer-title">Choose your sign. See its token.</h2>
            <p>Twelve signs, twelve official tokens. Pick one to see its record and its live market.</p>
            {season && <SeasonPulse season={season} />}
          </header>

          {stageMode && <GalleryBand active={active} setActive={setActive} consumer />}

          <div className={'consumer-explorer__layout' + (stageMode ? ' consumer-explorer__layout--stage' : '')}>
            {!stageMode && (
            <div
              className="consumer-signs"
              ref={gridRef}
              role="group"
              aria-label="Choose a zodiac sign"
              onKeyDown={onKeyDown}
            >
              {SIGNS.map((item) => {
                const isActive = item.ticker === active;
                return (
                  <button
                    key={item.ticker}
                    id={item.asset.sign}
                    type="button"
                    className={'consumer-sign' + (isActive ? ' is-active' : '')}
                    data-consumer-sign={item.asset.sign}
                    aria-label={`${item.name}, ${signDateLabel(item)}`}
                    aria-pressed={isActive}
                    aria-controls="consumer-sign-preview"
                    tabIndex={isActive ? 0 : -1}
                    style={{ '--sign-tone': item.hue }}
                    onClick={() => chooseIndex(item.order - 1)}
                  >
                    <picture className="consumer-sign__icon" aria-hidden="true">
                      <source srcSet={`/assets/zodiac-icons/128/${item.asset.sign}.avif`} type="image/avif" />
                      <img
                        src={`/assets/zodiac-icons/128/${item.asset.sign}.webp`}
                        width="56"
                        height="56"
                        alt=""
                        loading={item.order > 6 ? 'lazy' : 'eager'}
                        decoding="async"
                      />
                    </picture>
                    <span className="consumer-sign__name">{item.name}</span>
                  </button>
                );
              })}
            </div>
            )}

            <article
              id="consumer-sign-preview"
              className="consumer-preview"
              data-consumer-preview={sign.asset.sign}
              aria-labelledby="consumer-preview-name"
            >
              <div className="consumer-preview__art" aria-hidden="true">
                <img
                  key={sign.asset.sign}
                  className="consumer-preview__sculpture"
                  src={`/assets/sculptures/512/${sign.asset.sign}.webp`}
                  width="512"
                  height="512"
                  alt=""
                  decoding="async"
                />
                <picture className="consumer-preview__disc">
                  <source srcSet={`/assets/zodiac-icons/128/${sign.asset.sign}.avif`} type="image/avif" />
                  <img
                    src={`/assets/zodiac-icons/128/${sign.asset.sign}.webp`}
                    width="128"
                    height="128"
                    alt=""
                    decoding="async"
                  />
                </picture>
              </div>
              <div className="consumer-preview__body">
                <div className="consumer-preview__eyebrow">
                  <span>{String(sign.order).padStart(2, '0')} of 12</span>
                  {season?.sign.ticker === sign.ticker && <span>Current season</span>}
                  <span className="consumer-preview__status">Official record</span>
                </div>
                <h3 id="consumer-preview-name" className="consumer-preview__name">{sign.name}</h3>
                <p className="consumer-preview__dates">{signDateLabel(sign)}</p>
                <p className="consumer-preview__token">
                  <span>Official {sign.name} token</span>
                  <span className="consumer-preview__ticker">{sign.ticker}</span>
                  <span className="consumer-preview__network">Native network: Solana</span>
                </p>
                <TokenQuote sign={sign} />
                <p className="consumer-preview__lore">{sign.shortBio}</p>
                <div className="consumer-preview__actions">
                  <a className="btn btn--primary" href={registryProfilePath(sign)}>
                    <span>View the {sign.name} token</span><span className="arr" aria-hidden="true">→</span>
                  </a>
                  <CopyChip
                    text={sign.representations.solana.address}
                    display="Copy Solana address"
                  />
                </div>
                <p className="consumer-preview__base">
                  Also recorded on Base · <code className="mono">{truncateAddress(sign.representations.base.address, 6, 4)}</code>
                </p>
                <div className="consumer-preview__links">
                  <a className="consumer-preview__trade" href={`${registryProfilePath(sign)}#acquire`}>
                    Where {sign.ticker} trades <span aria-hidden="true">→</span>
                  </a>
                  <a className="consumer-preview__guide" href={`/${sign.asset.sign}/`}>
                    Read the {sign.name} astrology guide <span aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            </article>
          </div>

          <p className="sr-only" role="status" aria-live="polite" data-consumer-live>
            {sign.name} selected. {signDateLabel(sign)}. {sign.element}. {sign.archetype}.
          </p>
        </section>
      );
    }

    function ConsumerHowItWorks() {
      const reveal = useReveal();
      return (
        <section ref={reveal} id="registry" className="consumer-how reveal" aria-labelledby="consumer-how-title">
          <header className="consumer-section-head">
            <span className="consumer-section-head__eyebrow">One public reference</span>
            <h2 id="consumer-how-title">What the Registry does.</h2>
          </header>
          <p className="consumer-how__intro">
            The Registry is the public list of the twelve official Zodiac tokens.
            It shows which token belongs to each sign and where its record lives.
          </p>

          <ol id="identity" className="consumer-steps" aria-label="How to use the Registry">
            <li>Choose a token</li>
            <li>Check its official record</li>
            <li>Recognize it in another app</li>
          </ol>

          <div className="consumer-proof" aria-label="Registry facts">
            <span><strong>12</strong> signs</span>
            <span><strong>Solana + Base</strong> official records</span>
            <span><strong>Safe to browse</strong> no wallet required</span>
          </div>

          <details className="consumer-disclosure">
            <summary>How the records work</summary>
            <div className="consumer-disclosure__body">
              <p>
                Each Zodiac begins with one native Solana record. Its official Base counterpart
                points back to that origin through Wormhole. The public registry file lists both.
              </p>
              <p>
                &ldquo;Official&rdquo; means an address appears in this Registry. It is a statement
                about this list, not approval from a government, wallet, marketplace, or exchange.
              </p>
              <a href="/registry/technical/#records-networks">See the records and network details</a>
            </div>
          </details>
        </section>
      );
    }

    function ConsumerPurpose() {
      const reveal = useReveal();
      return (
        <section ref={reveal} id="thesis" className="consumer-purpose reveal" aria-labelledby="consumer-purpose-title">
          {REGISTRY_AURA_ENABLED && (
            <article className="consumer-collection" data-registry-collection>
              <div className="consumer-collection__art" aria-hidden="true">
                {SIGNS.slice(0, 4).map(item => (
                  <img
                    key={item.ticker}
                    src={`/assets/zodiac-icons/48/${item.asset.sign}.webp`}
                    width="36"
                    height="36"
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                ))}
              </div>
              <small className="consumer-section-head__eyebrow">Optional collection view</small>
              <h3>See the signs in a public wallet.</h3>
              <p>Turn a public collection into a simple view of signs, elements, and wheel coverage.</p>
              <a href={REGISTRY_AURA_PATH}>Open the collection view <span aria-hidden="true">→</span></a>
            </article>
          )}

          <div className="consumer-purpose__essay">
            <span className="consumer-section-head__eyebrow">Why keep a registry?</span>
            <h2 id="consumer-purpose-title">Familiar names deserve a clear record.</h2>
            <p>
              The signs have travelled through charts, jewellery, newspapers, and phones.
              A public list lets anyone check which token is really theirs.
            </p>
            <a href="/thesis/">Read why Zodiacs matter <span aria-hidden="true">→</span></a>
          </div>
        </section>
      );
    }

    const CONSUMER_FAQS = [
      {
        q: 'Is there an official token for my zodiac sign?',
        a: 'Yes. Each of the twelve signs has exactly one official token — native on Solana, with an official counterpart on Base. Both addresses are published here.'
      },
      {
        q: 'What does “official” mean?',
        a: 'The address appears in this Registry. It does not mean approval from a government, wallet, marketplace, or exchange.'
      },
      {
        q: 'How do I check whether a zodiac token is official?',
        a: 'Paste the mint or contract address into the checker on this page. The check is read-only and needs no wallet; anything not in the list is only reported as not found.'
      },
      {
        q: 'How do I buy a zodiac token?',
        a: 'Each sign’s record page carries its acquisition route through independent third-party venues. Zodiacs.org itself sells nothing; digital assets can lose all market value.'
      },
      {
        q: 'How do people invest in astrology?',
        a: 'Some collect the token of their sign the way they collect any cultural object. That is a speculative choice, not advice — prices can fall to zero. The reasoning lives in the thesis.'
      }
    ];

    function ConsumerFaq() {
      const reveal = useReveal();
      return (
        <section ref={reveal} id="faq" className="consumer-faq reveal" aria-labelledby="consumer-faq-title">
          <header className="consumer-section-head">
            <span className="consumer-section-head__eyebrow">Five quick answers</span>
            <h2 id="consumer-faq-title">Need to know.</h2>
          </header>
          <dl className="consumer-faq__list">
            {CONSUMER_FAQS.map(item => (
              <div className="consumer-faq__item" key={item.q}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      );
    }

    function ConsumerClosing() {
      const reveal = useReveal();
      return (
        <section ref={reveal} className="consumer-closing reveal" aria-label="Choose a sign">
          <h2>Your sign is waiting.</h2>
          <p>Start with the one you already know.</p>
          <div className="consumer-closing__actions">
            <a className="btn btn--primary" href="#official-twelve">
              <span>Choose a token</span><span className="arr" aria-hidden="true">↑</span>
            </a>
            <a href="/registry/technical/">Open the technical record</a>
          </div>
        </section>
      );
    }

    function TechnicalRecordsSection() {
      const records = SIGNS.flatMap(sign => sign.asset.representations);
      return (
        <section
          id="records-networks"
          className="technical-group technical-records"
          aria-labelledby="technical-records-title"
          data-technical-records
          data-record-count={SIGNS.length}
          data-representation-count={records.length}
        >
          <header className="technical-group__head">
            <span>01</span>
            <div>
              <h2 id="technical-records-title">Records and networks</h2>
              <p>Twelve sign identities. Twenty-four official representations. One canonical public file.</p>
            </div>
          </header>

          <div className="technical-records__table-wrap">
            <table className="technical-records__table">
              <caption>Official Solana and Base addresses for the twelve Zodiacs</caption>
              <thead>
                <tr><th scope="col">Sign</th><th scope="col">Solana · native</th><th scope="col">Base · bridged</th></tr>
              </thead>
              <tbody>
                {SIGNS.map(sign => (
                  <tr key={sign.ticker} data-technical-sign={sign.asset.sign}>
                    <th scope="row">
                      <img
                        src={`/assets/zodiac-icons/48/${sign.asset.sign}.webp`}
                        width="32"
                        height="32"
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                      <span>{sign.name}</span>
                    </th>
                    <td data-registry-address="solana" data-technical-representation="solana">
                      <CopyChip
                        text={sign.representations.solana.address}
                        display={truncateAddress(sign.representations.solana.address, 7, 6)}
                      />
                    </td>
                    <td data-registry-address="base" data-technical-representation="base">
                      <CopyChip
                        text={sign.representations.base.address}
                        display={truncateAddress(sign.representations.base.address, 7, 6)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="technical-records__notes">
            <p>
              Solana is the canonical origin. Each Base address is the official bridged ERC-20
              representation recorded through Wormhole and points back to its Solana mint.
            </p>
            <nav aria-label="Registry record resources">
              <a href="/registry/zodiacs.registry.json">Open registry JSON</a>
              <a href="https://github.com/ZodiacsOfficial/sdk" rel="noopener noreferrer">View the SDK source</a>
              <a href="/disclosure/#origin">Read provenance</a>
            </nav>
          </div>
        </section>
      );
    }

    function TechnicalEvidenceLinks() {
      return (
        <nav className="technical-evidence" aria-label="Safety and evidence resources">
          <a href="/disclosure/"><strong>Disclosure</strong><span>Methods, relationships, and risk</span></a>
          <a href="/archive/"><strong>Archive</strong><span>Dated public history</span></a>
          <a href="/registry/zodiacs.registry.json"><strong>Canonical JSON</strong><span>The machine-readable record</span></a>
          <a href="/sdk/"><strong>SDK documentation</strong><span>Read-only developer reference</span></a>
        </nav>
      );
    }

    function Footer({ technical = false }) {
      return (
        <footer className="ftr">
          <div className="ftr__row">
            <div className="mark">Zodiacs<span className="g">·</span>org</div>
            <div>© MMXXVI</div>
          </div>
        <div className="ftr__row">
          <div className="ftr__legal">
            {technical ? (
              <>
                <a href="/registry/">Consumer Registry</a>
                <a href="#records-networks">Records</a>
                <a href="#market-transparency">Market</a>
                <a href="#onchain-access">Access</a>
                <a href="#builders">Builders</a>
                <a href="#security">Safety</a>
              </>
            ) : (
              <>
                <a href="#official-twelve">The Twelve</a>
                <a href="#registry">How it works</a>
                <a href="#verify">Check an address</a>
                <a href="/registry/technical/">Technical record</a>
                <a href="#thesis">Thesis</a>
              </>
            )}
            <a href="/sdk/">SDK</a>
            <a href="/registry/zodiacs.registry.json">Record</a>
            <a href="/archive/">Archive</a>
            <button className="assistant-link" type="button" data-assistant-open aria-haspopup="dialog">Ask Zodiacs</button>
            <a href="/disclosure/">{REGISTRY_DISCLOSURE_LABEL}</a>
            <a href="/privacy/">Privacy</a>
            <a href="/terms/">Terms</a>
          </div>
            <div>Registry lookup tools: read-only</div>
          </div>
          <div className="ftr__row">
            <div className="ftr__legal" aria-label="Official channels">
              <a href="https://x.com/astrofoliosol" rel="noopener noreferrer">X</a>
              <a href="https://www.instagram.com/astrofolioonsol/" rel="noopener noreferrer">Instagram</a>
              <a href="https://tiktok.com/@astrofolio" rel="noopener noreferrer">TikTok</a>
              <a href="https://t.me/astrofoliosol" rel="noopener noreferrer">Telegram</a>
              <a href="https://astrofolio.xyz/" rel="noopener noreferrer">Astrofolio</a>
            </div>
            <div>Channels</div>
          </div>
          <div className="ftr__row ftr__row--origin">
            <span>
              Zodiacs.org · Official registry · Est. {REGISTRY_ESTABLISHED} ·{' '}
              {REGISTRY_ESTABLISHMENT_PROVENANCE_URL
                ? <a href={REGISTRY_ESTABLISHMENT_PROVENANCE_URL} rel="noopener nofollow">{REGISTRY_ESTABLISHMENT_PROVENANCE_LABEL}</a>
                : <a href="/disclosure/#origin">{REGISTRY_PROVENANCE_PENDING_LABEL}</a>}
            </span>
          </div>
        </footer>
      );
    }

    // ──────────────────────────────────────────────────────────────
    // Root
    // ──────────────────────────────────────────────────────────────
    const LEGACY_TECHNICAL_HASHES = {
      pulse: 'market-transparency',
      standings: 'market-transparency',
      'onchain-access': 'access-third-parties',
      builders: 'builder-tools',
      'built-with-zodiacs': 'builder-tools',
      sdk: 'builder-tools',
      security: 'safety-evidence'
    };

    function Zodiacs() {
      const technical = /^\/registry\/technical\/?$/.test(window.location.pathname);
      const [activeTicker, setActiveTicker] = useState(
        () => currentSeason()?.sign.ticker ?? SIGNS[0].ticker
      );
      const sign = useMemo(
        () => SIGNS.find(s => s.ticker === activeTicker) ?? SIGNS[0],
        [activeTicker]
      );

      useEffect(() => {
        trackAnalytics(technical ? 'registry_technical_visit' : 'registry_visit');
        const onClick = (event) => {
          const link = event.target.closest?.('a[href]');
          if (!link) return;
          const href = link.getAttribute('href') ?? '';
          const destination = href.startsWith('/sdk/')
            ? 'docs'
            : href.includes('npmjs.com/package/@zodiacs/sdk') ? 'npm'
              : href.includes('github.com/ZodiacsOfficial/sdk') ? 'github' : null;
          if (destination) trackAnalytics('sdk_click', { source: 'registry', destination });
        };
        document.addEventListener('click', onClick);
        return () => document.removeEventListener('click', onClick);
      }, [technical]);

      useEffect(() => {
        if (technical) return undefined;
        const redirectLegacyHash = () => {
          let id = '';
          try {
            id = decodeURIComponent(window.location.hash.slice(1));
          } catch {
            return;
          }
          const destination = LEGACY_TECHNICAL_HASHES[id];
          if (!destination) return;
          window.location.replace(`/registry/technical/${window.location.search}#${encodeURIComponent(destination)}`);
        };
        redirectLegacyHash();
        window.addEventListener('hashchange', redirectLegacyHash);
        return () => window.removeEventListener('hashchange', redirectLegacyHash);
      }, [technical]);

      useEffect(() => {
        let cancelled = false;
        let frame = 0;
        let settleTimer = 0;
        let resizeObserver = null;
        let mutationObserver = null;
        let layoutObserver = null;
        let stopObserving = 0;
        let realignTimers = [];
        const currentHashId = () => {
          try {
            return decodeURIComponent(window.location.hash.slice(1));
          } catch {
            return '';
          }
        };
        const alignHashTarget = () => {
          if (cancelled) return;
          const id = currentHashId();
          if (!id) return;
          document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' });
        };
        const queueRealignments = () => {
          realignTimers.forEach((timer) => window.clearTimeout(timer));
          alignHashTarget();
          realignTimers = [250, 1000, 2500, 4500, 7000, 10000].map((delay) => (
            window.setTimeout(alignHashTarget, delay)
          ));
        };
        const scheduleAlignment = () => {
          window.clearTimeout(settleTimer);
          settleTimer = window.setTimeout(alignHashTarget, 120);
        };
        const afterLayout = () => {
          frame = window.requestAnimationFrame(() => {
            frame = window.requestAnimationFrame(alignHashTarget);
          });
        };
        const stopObservers = () => {
          resizeObserver?.disconnect();
          mutationObserver?.disconnect();
          layoutObserver?.disconnect();
        };
        const stopAlignmentOnInput = (event) => {
          if (!event.isTrusted) return;
          window.clearTimeout(settleTimer);
          realignTimers.forEach((timer) => window.clearTimeout(timer));
          realignTimers = [];
          stopObservers();
        };

        if (document.fonts?.ready) {
          document.fonts.ready.then(afterLayout);
        } else {
          afterLayout();
        }
        window.addEventListener('load', alignHashTarget, { once: true });

        const shell = document.querySelector('.zd');
        if (shell && 'ResizeObserver' in window) {
          resizeObserver = new ResizeObserver(scheduleAlignment);
          resizeObserver.observe(document.querySelector('.cine') ?? shell);
          const gallery = document.querySelector('.gband');
          if (gallery) resizeObserver.observe(gallery);
          const initialId = currentHashId();
          for (const child of shell.children) {
            resizeObserver.observe(child);
            if (initialId && child.id === initialId) break;
          }
        }
        if (shell && 'MutationObserver' in window) {
          mutationObserver = new MutationObserver(scheduleAlignment);
          mutationObserver.observe(shell, {
            childList: true,
            characterData: true,
            subtree: true,
          });
        }
        if ('PerformanceObserver' in window
          && PerformanceObserver.supportedEntryTypes?.includes('layout-shift')) {
          layoutObserver = new PerformanceObserver((list) => {
            if (list.getEntries().some((entry) => !entry.hadRecentInput)) scheduleAlignment();
          });
          layoutObserver.observe({ type: 'layout-shift', buffered: true });
        }
        queueRealignments();
        window.addEventListener('hashchange', queueRealignments);
        window.addEventListener('wheel', stopAlignmentOnInput, { passive: true });
        window.addEventListener('touchstart', stopAlignmentOnInput, { passive: true });
        window.addEventListener('pointerdown', stopAlignmentOnInput, { passive: true });
        window.addEventListener('keydown', stopAlignmentOnInput);
        stopObserving = window.setTimeout(stopObservers, 12000);

        return () => {
          cancelled = true;
          window.cancelAnimationFrame(frame);
          window.clearTimeout(settleTimer);
          window.clearTimeout(stopObserving);
          realignTimers.forEach((timer) => window.clearTimeout(timer));
          stopObservers();
          window.removeEventListener('load', alignHashTarget);
          window.removeEventListener('hashchange', queueRealignments);
          window.removeEventListener('wheel', stopAlignmentOnInput);
          window.removeEventListener('touchstart', stopAlignmentOnInput);
          window.removeEventListener('pointerdown', stopAlignmentOnInput);
          window.removeEventListener('keydown', stopAlignmentOnInput);
        };
      }, []);

      if (technical) {
        return (
          <>
            <a href="#main" className="skip">Skip to content</a>
            <div className="stars" aria-hidden="true" />
            <div className="grain" aria-hidden="true" />
            <Header />
            <main id="main" className="zd technical-registry">
              <header className="technical-hero">
                <a className="technical-hero__back" href="/registry/">← Consumer Registry</a>
                <span className="technical-hero__kicker">The complete public record</span>
                <h1>Registry <span className="it">technical record.</span></h1>
                <p>
                  Addresses, networks, market methodology, third-party access,
                  builder tools, and disclosures for the twelve Zodiacs.
                </p>
                <dl className="technical-hero__facts">
                  <div><dt>12</dt><dd>signs</dd></div>
                  <div><dt>24</dt><dd>official addresses</dd></div>
                  <div><dt>2</dt><dd>networks</dd></div>
                </dl>
              </header>

              <nav className="technical-nav" aria-label="Technical record sections">
                <a href="#records-networks"><span>01</span>Records and networks</a>
                <a href="#market-transparency"><span>02</span>Market and transparency</a>
                <a href="#access-third-parties"><span>03</span>Access and third parties</a>
                <a href="#builder-tools"><span>04</span>Builders</a>
                <a href="#safety-evidence"><span>05</span>Safety and evidence</a>
              </nav>

              <TechnicalRecordsSection />

              <section id="market-transparency" className="technical-group" aria-labelledby="technical-market-title">
                <header className="technical-group__head">
                  <span>02</span>
                  <div><h2 id="technical-market-title">Market and transparency</h2><p>Live attention, market context, sources, and methodology.</p></div>
                </header>
                <PulseSection />
                <StandingsSection />
              </section>

              <section id="access-third-parties" className="technical-group" aria-labelledby="technical-access-title">
                <header className="technical-group__head">
                  <span>03</span>
                  <div><h2 id="technical-access-title">Access and third parties</h2><p>Independent interfaces and point-of-action warnings.</p></div>
                </header>
                <OnchainAccessSection />
              </section>

              <section id="builder-tools" className="technical-group" aria-labelledby="technical-builders-title">
                <span id="builders" className="technical-group__legacy-anchor" aria-hidden="true" />
                <header className="technical-group__head">
                  <span>04</span>
                  <div><h2 id="technical-builders-title">Builders</h2><p>SDK capabilities, examples, APIs, and product uses.</p></div>
                </header>
                <ForBuildersSection />
                <BuiltWithZodiacsSection />
                <IdentityContextSection />
                <SdkSection />
              </section>

              <section id="safety-evidence" className="technical-group" aria-labelledby="technical-safety-title">
                <header className="technical-group__head">
                  <span>05</span>
                  <div><h2 id="technical-safety-title">Safety and evidence</h2><p>Read-only posture, provenance, disclosures, archive, and full questions.</p></div>
                </header>
                <SecuritySection />
                <TechnicalEvidenceLinks />
                <FaqSection />
              </section>

              <Footer technical />
            </main>
          </>
        );
      }

      return (
        <>
          <a href="#main" className="skip">Skip to content</a>
          <div className="stars" aria-hidden="true" />
          <div className="grain" aria-hidden="true" />
          <Header />
          <CineHero sign={sign} />
          <main id="main" className="zd consumer-registry">
            <ConsumerExplorer active={activeTicker} setActive={setActiveTicker} sign={sign} />
            <ConsumerTokensSection />
            <ConsumerHowItWorks />
            <VerifierSection />
            <ConsumerPurpose />
            <ConsumerFaq />
            <ConsumerClosing />
            <Footer />
          </main>
        </>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<Zodiacs />);
