    const { useState, useMemo, useEffect, useRef, useCallback } = React;

    function trackAnalytics(name, properties = {}) {
      window.zodiacsAnalytics?.track?.(name, properties);
    }

    // IntersectionObserver-driven scroll reveal — no static mount.
    // Returns a ref-callback that adds `is-in` once the element enters.
    function useReveal(threshold = 0.15) {
      return useCallback((el) => {
        if (!el) return;
        const io = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) {
            el.classList.add('is-in');
            io.disconnect();
          }
        }, { threshold, rootMargin: '0px 0px -10% 0px' });
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

    // Verifier lookup helpers — same registry semantics exposed by
    // @zodiacs/sdk through isOfficialZodiacAddress() etc.
    const norm = (s) => (s || '').trim();
    const eq = (a, b) => norm(a).toLowerCase() === norm(b).toLowerCase();
    function lookupAddress(input) {
      const q = norm(input);
      if (!q) return null;
      for (const sign of SIGNS) {
        for (const representation of sign.asset.representations) {
          if (representation.address && eq(representation.address, q)) {
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
      const featuredHref = registryProfilePath(sign);
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
                  Meet the twelve signs through their symbols, stories, and living traditions.
                </p>
                <div className="cine__cta">
                  <a className="btn btn--primary" href={featuredHref} data-registry-browse>
                    <span>Browse the Twelve</span>
                    <span className="arr">↗</span>
                  </a>
                  {REGISTRY_AURA_ENABLED && (
                    <a
                      className="btn btn--ghost"
                      href={REGISTRY_AURA_PATH}
                      aria-label={REGISTRY_AURA_HERO_COPY.ariaLabel}
                      data-registry-collection
                    >
                      <span>{REGISTRY_AURA_HERO_COPY.cta}</span>
                      <span className="cta-arr" aria-hidden="true">→</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }

    function Hero({ sign, animKey, active, setActive }) {
      const season = useMemo(() => currentSeason(), []);
      return (
        <section className="hero" id="main">
          <div className="hero__eyebrow">
            <span className="pulse-dot" aria-hidden="true" />
            <span className="label label--gold" style={{ fontSize: 9.5 }}>
              <span className="sr-only">Live. </span>
              The Registry
            </span>
          </div>
          {season && (
            <div className="hero__season">
              {season.sign.name} season · day {season.day} of {season.total}
            </div>
          )}

          <p className="hero__sub">
            One record for the twelve signs. Verify what belongs, where it
            lives, and how public blockchain records become symbolic context.
          </p>

          {!GALLERY_LIVE && <Selector active={active} setActive={setActive} />}

          <FeaturedCard sign={sign} animKey={animKey} />
        </section>
      );
    }


    function FeaturedCard({ sign, animKey }) {
      const reveal = useReveal();
      const baseAddr = sign.representations.base.address;
      const solanaMint = sign.representations.solana.address;

      return (
        <article
          ref={reveal}
          id="featured-sign"
          className="card reveal"
          aria-label={`Featured sign · ${sign.name}`}
          data-featured-sign={sign.asset.sign}
        >
          <span className="card__corner card__corner--tl" />
          <span className="card__corner card__corner--tr" />
          <span className="card__corner card__corner--bl" />
          <span className="card__corner card__corner--br" />

          <div className="card__inner">
            <div className="card__head card__head--right">
              <span className="label label--mute">
                {ROMAN[sign.order - 1]}<span className="sep">/</span>XII
              </span>
            </div>

            <div className="glyph-stage">
              <a
                className="nugget-link"
                href={registryProfilePath(sign)}
                aria-label={`Open the ${sign.name} catalogue entry`}
              >
                <img
                  className="nugget fade-key"
                  key={animKey + '-glyph'}
                  src={`/assets/nuggets/${sign.name.toLowerCase()}.png`}
                  alt={`${sign.name} sculptural figure`}
                  fetchpriority="high"
                  decoding="async"
                />
              </a>
            </div>

            <div className="fade-key" key={animKey + '-meta'}>
              <h2 className="card__name">{sign.name}</h2>
              <div className="card__meta">
                <span className="g">{sign.ticker}</span>
                <span className="dot" />
                <span>{sign.element}</span>
                <span className="dot" />
                <span>{sign.modality}</span>
                <span className="dot" />
                <span>{sign.rulingPlanet}</span>
              </div>
              <div className="card__archetype">
                <span className="card__archetype-rule" aria-hidden="true" />
                <span className="card__archetype-text">{sign.archetype}</span>
                <span className="card__archetype-rule" aria-hidden="true" />
              </div>
            </div>

            <div className="card__addr fade-key" key={animKey + '-addr'}>
              <div className="card__addr-row">
                <span className="card__addr-k">Native · Solana</span>
                {solanaMint
                  ? <CopyChip text={solanaMint} display={truncateAddress(solanaMint, 4, 4)} />
                  : <span className="card__addr-pending">Forthcoming</span>}
              </div>
              <div className="card__addr-row">
                <span className="card__addr-k">Bridged · Base</span>
                <CopyChip text={baseAddr} display={truncateAddress(baseAddr, 6, 4)} />
              </div>
            </div>

            <p className="card__bio fade-key" key={animKey + '-bio'}>
              {sign.shortBio}
            </p>
          </div>
        </article>
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
          aria-label={`Copy address ${text}`}
          title={text}
        >
          <span className="copychip__text mono">{display || text}</span>
          <span className="copychip__icon" aria-hidden="true">
            {copied ? '✓' : '⧉'}
          </span>
        </button>
      );
    }

    function Selector({ active, setActive }) {
      const ref = useRef(null);
      const mounted = useRef(false);
      const activeIndex = Math.max(0, SIGNS.findIndex(s => s.ticker === active));
      const activeSign = SIGNS[activeIndex];
      const [edges, setEdges] = useState({ left: false, right: false });

      const updateEdges = useCallback(() => {
        const strip = ref.current;
        if (!strip) return;
        const max = Math.max(0, strip.scrollWidth - strip.clientWidth);
        const next = {
          left: strip.scrollLeft > 2,
          right: strip.scrollLeft < max - 2,
        };
        setEdges((previous) => (
          previous.left === next.left && previous.right === next.right
            ? previous
            : next
        ));
      }, []);

      // Edge fades only appear while content is genuinely clipped. Desktop
      // switches to a complete grid, so both resolve false there.
      useEffect(() => {
        const strip = ref.current;
        if (!strip) return undefined;
        const observer = typeof ResizeObserver === 'undefined'
          ? null
          : new ResizeObserver(updateEdges);
        observer?.observe(strip);
        strip.addEventListener('scroll', updateEdges, { passive: true });
        window.addEventListener('resize', updateEdges);
        requestAnimationFrame(updateEdges);
        return () => {
          observer?.disconnect();
          strip.removeEventListener('scroll', updateEdges);
          window.removeEventListener('resize', updateEdges);
        };
      }, [updateEdges]);

      // Horizontal-only centering — never touch page vertical scroll.
      useEffect(() => {
        const strip = ref.current;
        const el = strip?.querySelector('.is-active');
        if (!strip || !el) return;
        const target =
          el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2;
        strip.scrollTo({
          left: Math.max(0, target),
          behavior: mounted.current
            && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'smooth'
            : 'auto',
        });
        mounted.current = true;
        requestAnimationFrame(updateEdges);
      }, [active, updateEdges]);

      const handlePick = (ticker) => {
        setActive(ticker);
      };

      const chooseIndex = (index, focus = false) => {
        const next = SIGNS[Math.max(0, Math.min(SIGNS.length - 1, index))];
        if (!next) return;
        setActive(next.ticker);
        if (focus) {
          requestAnimationFrame(() => {
            ref.current
              ?.querySelector(`[data-sign="${next.asset.sign}"]`)
              ?.focus({ preventScroll: true });
          });
        }
      };

      const handleKeyDown = (event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        let nextIndex = null;
        if (event.key === 'ArrowRight') nextIndex = activeIndex + 1;
        if (event.key === 'ArrowLeft') nextIndex = activeIndex - 1;
        if (event.key === 'ArrowDown') nextIndex = activeIndex + 6;
        if (event.key === 'ArrowUp') nextIndex = activeIndex - 6;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = SIGNS.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        chooseIndex(nextIndex, true);
      };

      return (
        <section className="strip-wrap" aria-label="Zodiac selector">
          <div className="strip__head" aria-hidden="true">
            <span>Choose a sign</span>
            <span className="strip__status">
              {String(activeIndex + 1).padStart(2, '0')} / 12 · {activeSign.name}
            </span>
          </div>
          <div
            className={
              'strip__viewport'
              + (edges.left ? ' can-scroll-left' : '')
              + (edges.right ? ' can-scroll-right' : '')
            }
          >
            <div
              className="strip"
              id="zodiac-sign-strip"
              ref={ref}
              role="group"
              aria-label="Choose the featured zodiac sign"
              onKeyDown={handleKeyDown}
            >
              {SIGNS.map(s => {
                const isActive = active === s.ticker;
                return (
                  <button
                    key={s.ticker}
                    id={`zodiac-tab-${s.asset.sign}`}
                    data-sign={s.asset.sign}
                    className={'strip__glyph' + (isActive ? ' is-active' : '')}
                    onClick={() => handlePick(s.ticker)}
                    aria-pressed={isActive}
                    aria-controls="featured-sign"
                    aria-label={s.name}
                    title={s.name}
                    tabIndex={isActive ? 0 : -1}
                  >
                    <picture className="strip__icon" aria-hidden="true">
                      <source srcSet={`/assets/zodiac-icons/48/${s.asset.sign}.avif`} type="image/avif" />
                      <img
                        src={`/assets/zodiac-icons/48/${s.asset.sign}.webp`}
                        width="28"
                        height="28"
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    </picture>
                    <span className="strip__name">{s.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="strip__sub">
            Swipe or scroll to choose
          </div>
        </section>
      );
    }

    /* The gallery band — the twelve Gold Sculptures as the hub's selector.
       Set before first paint by the head probe; constant for the page's
       life, so the strip and the band never both render. */
    const GALLERY_LIVE = document.documentElement.classList.contains('gallery-live');

    let galleryBundleRequested = false;

    function GalleryBand({ active, setActive }) {
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
          className="gband"
          aria-label="The Gallery — the twelve Gold Sculptures"
          data-gallery-stage=""
          data-gallery-embed=""
          data-gallery-initial={slug}
        >
          <div className="gband__mount" data-gallery-canvas="" />
          <p className="gband__name" data-gallery-name="" aria-hidden="true" />
          <div className="gband__chrome">
            <div className="rail" data-gallery-rail="" role="group" aria-label="The twelve sculptures" />
            <button className="gband__open" type="button" data-gallery-open="">
              View the sculpture
            </button>
            <p className="gband__hint" data-gallery-hint="">
              Select a sculpture for its record and market context. Drag
              sideways to walk the row.
            </p>
          </div>

          <aside className="gcard" data-gallery-card="" hidden aria-labelledby="gcard-name" aria-live="off">
            <button className="card__close" type="button" data-gallery-close="" aria-label="Return the sculpture">✕</button>
            <p className="card__lot" data-card-lot="" />
            <h2 className="card__name" id="gcard-name" data-card-name="" />
            <p className="card__figure" data-card-figure="" />

            <div className="card__market">
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

    /* The 'Registry' section — institutional identity card. Same
       museum-vitrine aesthetic as the Detail Panel; restated as facts
       about the registry itself, not about a single sign. */
    function RegistrySection() {
      const reveal = useReveal();
      const facts = [
        { k: '12',         v: 'Signs' },
        { k: '1',          v: 'Origin' },
        { k: '2',          v: 'Homes' },
        { k: 'Read-only',   v: 'Lookup' },
      ];
      const meta = [
        { k: 'Original home',  v: 'Solana' },
        { k: 'Base presence',  v: 'Official counterpart' },
        { k: 'Bridge record',  v: 'Wormhole' },
        { k: 'Developer kit',  v: '@zodiacs/sdk' },
        { k: 'Public record',  v: <a className="ext" href="/registry/zodiacs.registry.json">Registry file</a> },
      ];

      return (
        <section ref={reveal} id="registry" className="sec reveal" aria-label="Registry">
          <div className="sec__head">
            <span className="sec__no">Nº 01</span>
            <span className="line" />
            <h2 className="sec__title">Registry</h2>
          </div>
          <p className="sec__lede">
            Each sign has one identity. The original asset lives on Solana;
            its official Base counterpart points back to that origin. The
            registry is the source of truth for both.
          </p>
          <p className="sec__disclosure">
            Astrofolio is a related but separate consumer experience; Zodiacs.org
            remains the astrology reference and the official Registry and SDK source.
          </p>
          <p className="sec__disclosure">
            “Official” means that an asset address appears in this Registry. It
            is not government, regulator, wallet, or exchange approval, and it
            does not prove identity, control, legal ownership, safety, value,
            liquidity, or future performance.
          </p>

          <div className="reg__facts">
            {facts.map((f, i) => (
              <div className="reg__fact" key={i}>
                <div className="reg__fact-k">{f.k}</div>
                <div className="reg__fact-v">{f.v}</div>
              </div>
            ))}
          </div>

          <dl className="reg__meta">
            {meta.map((m, i) => (
              <div className="detail__row" key={i}>
                <dt className="k">{m.k}</dt>
                <dd className="v">{m.v}</dd>
              </div>
            ))}
          </dl>
        </section>
      );
    }

    /* Verifier — the most strategically important section on the page.
       Real working JS against the embedded SIGNS array. Three states:
       found-base, found-solana, not-found. Neutral copy for unknowns. */
    function VerifierSection() {
      const reveal = useReveal();
      const [input, setInput] = useState('');
      const [result, setResult] = useState(null); // null | {state, sign?, network?}
      const onSubmit = (e) => {
        e.preventDefault();
        const hit = lookupAddress(input);
        const query = norm(input);
        const chain = /^0x[0-9a-f]{40}$/i.test(query)
          ? 'base'
          : /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query) ? 'solana' : 'invalid';
        trackAnalytics('verifier_used', { chain: hit?.network ?? chain, outcome: hit ? 'official' : 'not_found' });
        if (!hit) { setResult({ state: 'not-found', queried: query }); return; }
        setResult({ state: 'official-' + hit.network, sign: hit.sign, network: hit.network, queried: query });
      };
      const onClear = () => { setInput(''); setResult(null); };
      // Pick three "try-one" examples so the section demonstrates itself.
      const examples = ['LEO', 'CANCER', 'PISCES'].map(t => SIGNS.find(s => s.ticker === t));

      return (
        <section ref={reveal} id="verify" className="sec reveal" aria-label="Verify">
          <div className="sec__head">
            <span className="sec__no">Nº 02</span>
            <span className="line" />
            <h2 className="sec__title">Verify</h2>
          </div>
          <p className="sec__lede">
            Paste an address. We'll tell you which sign.
          </p>

          <form className="vrf" onSubmit={onSubmit}>
            <label className="sr-only" htmlFor="vrf-input">Address</label>
            <input
              id="vrf-input"
              className="vrf__input mono"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="Paste an address"
              value={input}
              onChange={e => setInput(e.target.value)}
            />
            <button type="submit" className="vrf__submit">Verify</button>
          </form>

          <div className="vrf__examples">
            <span className="label label--mute">Try one</span>
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
            <div className={'vrf__result vrf__result--' + result.state} role="status" aria-live="polite">
              {result.state === 'official-base' && (
                <>
                  <div className="vrf__result-head">
                    <span className="vrf__tick">✓</span>
                    <span>Bridged Zodiac · Base</span>
                  </div>
                  <VrfResultBody sign={result.sign} network="base" queried={result.queried} />
                </>
              )}
              {result.state === 'official-solana' && (
                <>
                  <div className="vrf__result-head">
                    <span className="vrf__tick">✓</span>
                    <span>Native Zodiac · Solana</span>
                  </div>
                  <VrfResultBody sign={result.sign} network="solana" queried={result.queried} />
                </>
              )}
              {result.state === 'not-found' && (
                <>
                  <div className="vrf__result-head">
                    <span className="vrf__cross">—</span>
                    <span>{REGISTRY_VERIFIER_NOT_FOUND_SENTENCE}</span>
                  </div>
                  <div className="vrf__result-meta mono">{truncateAddress(result.queried, 10, 8) || '—'}</div>
                </>
              )}
            </div>
          )}
        </section>
      );
    }

    function VrfResultBody({ sign, network, queried }) {
      return (
        <div className="vrf__result-body">
          <div className="vrf__result-sign">
            <img
              className="vrf__result-icon"
              src={`/assets/icons/${sign.name.toLowerCase()}.png`}
              alt=""
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

    function MarketContext({ sign }) {
      const ref = useRef(null);
      const [inView, setInView] = useState(false);
      useEffect(() => {
        const node = ref.current;
        if (!node) return;
        if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }
        const io = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) { setInView(true); io.disconnect(); }
        }, { rootMargin: '0px 0px 15% 0px' });
        io.observe(node);
        return () => io.disconnect();
      }, []);
      const { state } = useMarketContext(sign, inView);
      const pair = state.status === 'ok' ? state.pair : null;
      const change = toFiniteNumber(pair?.priceChange24h);
      const changeClass = change === null
        ? ''
        : change > 0
          ? ' market__change--up'
          : change < 0
            ? ' market__change--down'
            : ' market__change--flat';
      const cells = pair ? [
        { k: 'Price USD', v: formatPriceUsd(pair.priceUsd), mono: true },
        { k: '24H Change', v: formatPercent(pair.priceChange24h), mono: true, className: changeClass },
        { k: 'Liquidity', v: formatUsdCompact(pair.liquidityUsd) },
        { k: 'Market Cap', v: formatUsdCompact(pair.marketCap) },
        { k: 'Pair Created', v: formatPairDate(pair.pairCreatedAt) },
        { k: 'Source / DEX', v: formatDexId(pair.dexId) }
      ] : [];

      return (
        <aside ref={ref} className="market" aria-label={`${sign.name} market context`}>
          <div className="market__head">
            <div>
              <span className="market__label">Market Context</span>
              <p className="market__copy">
                Independent third-party data, not a valuation or recommendation.
                It may be delayed or unavailable; prices and liquidity can change
                quickly, and a Zodiac can lose all market value. Operator and
                economic-interest statements remain pending confirmation; see
                the <a href="/disclosure/">Disclosure</a>.
              </p>
            </div>
            {pair?.url && (
              <a className="market__source" href={pair.url} rel="noopener noreferrer">
                Dex Screener ↗
              </a>
            )}
          </div>

          {state.status === 'ok' && (
            <div className="market__grid">
              {cells.map((cell) => (
                <div className="market__cell" key={cell.k}>
                  <div className="market__k">{cell.k}</div>
                  <div className={'market__v' + (cell.mono ? ' market__v--mono' : '') + (cell.className || '')}>
                    {cell.v}
                  </div>
                </div>
              ))}
            </div>
          )}

          {state.status === 'loading' && (
            <div className="market__body">
              <p className="market__state">Loading market context.</p>
            </div>
          )}

          {state.status === 'unavailable' && (
            <div className="market__body">
              <p className="market__state">Market context unavailable.</p>
            </div>
          )}
        </aside>
      );
    }

    function DetailPanel({ sign, animKey }) {
      const reveal = useReveal();
      return (
        <section ref={reveal} className="sec reveal" aria-label="Detail panel">
          <div className="sec__head">
            <span className="sec__no">Nº 03</span>
            <span className="line" />
            <h2 className="sec__title">Museum label</h2>
          </div>

          <article className="detail fade-key" key={animKey + '-detail'}>
            <a
              className="detail__symbol-link"
              href={`/registry/${sign.asset.sign}/`}
              aria-label={`${sign.name} — open catalogue entry`}
              title="Open catalogue entry"
            >
              <img
                className="detail__symbol"
                src={`/assets/zodiac-icons/128/${sign.asset.sign}.webp`}
                width="56"
                height="56"
                alt=""
                decoding="async"
              />
            </a>
            <span className="detail__ticker">{sign.ticker}</span>
            <h3 className="detail__name">{sign.name}</h3>

            <div className="detail__rows">
              <div className="detail__row">
                <span className="k">Order</span>
                <span className="v mono">{String(sign.order).padStart(2, '0')} / 12</span>
              </div>
              <div className="detail__row">
                <span className="k">Element</span>
                <span className="v">{sign.element}</span>
              </div>
              <div className="detail__row">
                <span className="k">Modality</span>
                <span className="v">{sign.modality}</span>
              </div>
              <div className="detail__row">
                <span className="k">Ruling planet</span>
                <span className="v">{sign.rulingPlanet}</span>
              </div>
              <div className="detail__row">
                <span className="k">Archetype</span>
                <span className="v">{sign.archetype}</span>
              </div>
              <div className="detail__row">
                <span className="k">Shelf</span>
                <span className="v">
                  <a className="detail__shelf" href="https://astrofolio.xyz/" rel="noopener noreferrer">
                    <img
                      className="detail__shelf-icon"
                      src={`/assets/sdk/zodiac-icons/circle/${sign.asset.sign}.png`}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      width="20"
                      height="20"
                    />
                    <span>On Astrofolio</span>
                  </a>
                </span>
              </div>
              <div className="detail__row">
                <span className="k">Original · Solana</span>
                <span className="v">
                  {sign.representations.solana.address
                    ? <CopyChip text={sign.representations.solana.address} display={truncateAddress(sign.representations.solana.address, 4, 4)} />
                    : <span className="card__addr-pending">Forthcoming</span>}
                </span>
              </div>
              <div className="detail__row">
                <span className="k">Counterpart · Base</span>
                <span className="v">
                  <CopyChip text={sign.representations.base.address} display={truncateAddress(sign.representations.base.address, 6, 4)} />
                </span>
              </div>
            </div>

            <blockquote className="detail__bio">
              {sign.shortBio}
            </blockquote>

            <MarketContext sign={sign} />

            <a className="detail__entry" href={`/registry/${sign.asset.sign}/`}>
              <span>Full catalogue entry — lore, provenance &amp; acquisition</span>
              <span className="detail__entry-arr" aria-hidden="true">→</span>
            </a>
          </article>
        </section>
      );
    }

    function Philosophy() {
      const reveal = useReveal();
      return (
        <section ref={reveal} id="thesis" className="phil reveal" aria-label="Philosophy">
          <h2 className="sr-only">Thesis</h2>
          <div className="phil__sup">
            <span className="label label--gold">Nº 04 · Thesis</span>
            <span className="line" />
          </div>
          <p className="phil__body">
            <span className="dc">B</span>efore modern markets, nations, and digital
            identities, the zodiac gave civilization a symbolic language for
            time, character, and destiny. Zodiacs.org preserves that memory
            in a digital form built around identity, scarcity, and cultural
            endurance.
          </p>
          <div className="phil__sig">
            <span>Composed in twelve parts</span>
            <span>·</span>
            <span>MMXXVI</span>
          </div>
          <a className="phil__more" href="/thesis/">
            <span>Read the full thesis — belief is the oldest asset</span>
            <span className="phil__more-arr" aria-hidden="true">→</span>
          </a>
        </section>
      );
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
            From public records<br/>
            <span className="it">to personal patterns.</span>
          </h2>

          <p className="idctx__copy">
            Verify an official Zodiac, understand the pattern formed by a
            public collection, or carry trusted Registry facts into another
            product. For collectors, Registry Collection shows the twelve-sign
            pattern at a public address; a saved chart is an optional layer.
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
        <section ref={reveal} id="builders" className="sec builders reveal" aria-label="For Builders">
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

    function CatalogGrid({ active, setActive }) {
      const reveal = useReveal();
      return (
        <section ref={reveal} className="sec reveal" id="official-twelve" aria-label="The official twelve">
          <div className="sec__head">
            <span className="sec__no">Nº 11</span>
            <span className="line" />
            <h2 className="sec__title">The Twelve</h2>
          </div>

          <div className="cat">
            {SIGNS.map(s => (
              <div
                key={s.ticker}
                className={'cat__item' + (active === s.ticker ? ' is-active' : '')}
              >
                <div className="cat__head">
                  <span className="cat__no">Nº {String(s.order).padStart(2, '0')} / 12</span>
                </div>
                <a
                  className="cat__sym cat__sym--button"
                  href={`/registry/${s.asset.sign}/`}
                  aria-label={`Open the ${s.name} catalogue entry`}
                >
                  <img
                    src={`/assets/nuggets/thumb/${s.name.toLowerCase()}.png`}
                    alt={`${s.name} figure`}
                    loading="lazy"
                    decoding="async"
                  />
                </a>
                <div className="cat__name">{s.name}</div>
                <div className="cat__tk">{s.ticker}</div>
                <div className="cat__meta">{s.element} · {s.archetype}</div>
                <div className="cat__addr">
                  <span className="cat__addr-k">Base</span>
                  <CopyChip
                    text={s.representations.base.address}
                    display={truncateAddress(s.representations.base.address, 5, 4)}
                  />
                </div>
                <a className="cat__entry" href={`/registry/${s.asset.sign}/`}>
                  <span>Catalogue entry</span>
                  <span className="cat__entry-arr" aria-hidden="true">→</span>
                </a>
              </div>
            ))}
          </div>

          <nav className="cat__lots" aria-label="Catalogue entries by glyph">
            {SIGNS.map(s => (
              <a
                key={s.ticker}
                className="cat__lot"
                href={`/registry/${s.asset.sign}/`}
                title={`${s.name} — catalogue entry`}
                aria-label={`${s.name} — catalogue entry`}
              >
                <img
                  src={`/assets/icons/${s.name.toLowerCase()}.png`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </a>
            ))}
          </nav>
          <p className="cat__lots-note">
            Tap a glyph to open its catalogue entry — lore, provenance &amp; acquisition.
            {' '}The same twelve stand as Gold Sculptures in{' '}
            <a className="cat__shelf-link" href="#gallery">the gallery above</a>.
          </p>
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

    function Closing() {
      const reveal = useReveal();
      return (
        <section ref={reveal} className="close reveal" aria-label="Closing">
          <div className="close__sigil">
            ♈︎ ♉︎ ♊︎ ♋︎ ♌︎ ♍︎ ♎︎ ♏︎ ♐︎ ♑︎ ♒︎ ♓︎
          </div>
          <h2 className="close__head">
            Twelve signs.<br/>
            <span className="it">One enduring language.</span>
          </h2>
          <p className="close__sub">
            A symbolic collection for a digital era.
          </p>
          <a className="btn btn--primary" href="#official-twelve" style={{ width: '100%', justifyContent: 'space-between' }}>
            <span>View the Twelve</span>
            <span className="arr">→</span>
          </a>
        </section>
      );
    }

    function Footer() {
      return (
        <footer className="ftr">
          <div className="ftr__row">
            <div className="mark">Zodiacs<span className="g">·</span>org</div>
            <div>© MMXXVI</div>
          </div>
        <div className="ftr__row">
          <div className="ftr__legal">
            <a href="#registry">Registry</a>
            <a href="#verify">Verify</a>
            <a href="#builders">Builders</a>
            <a href="/sdk/">SDK</a>
            <a href="/registry/zodiacs.registry.json">Record</a>
            <a href="#thesis">Thesis</a>
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
    function Zodiacs() {
      const [activeTicker, setActiveTicker] = useState(
        () => currentSeason()?.sign.ticker ?? SIGNS[0].ticker
      );
      const sign = useMemo(
        () => SIGNS.find(s => s.ticker === activeTicker) ?? SIGNS[0],
        [activeTicker]
      );

      useEffect(() => {
        trackAnalytics('registry_visit');
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
      }, []);

      return (
        <>
          <a href="#main" className="skip">Skip to content</a>
          <div className="stars" aria-hidden="true" />
          <div className="grain" aria-hidden="true" />
          <Header />
          <CineHero sign={sign} />
          {GALLERY_LIVE && (
            <GalleryBand active={activeTicker} setActive={setActiveTicker} />
          )}
          <div className="zd">
            <Hero
              sign={sign}
              animKey={activeTicker}
              active={activeTicker}
              setActive={setActiveTicker}
            />
            <RegistrySection />
            <VerifierSection />
            <DetailPanel sign={sign} animKey={activeTicker} />
            <Philosophy />
            <PulseSection />
            <StandingsSection />
            <IdentityContextSection />
            <OnchainAccessSection />
            <ForBuildersSection />
            <BuiltWithZodiacsSection />
            <CatalogGrid active={activeTicker} setActive={setActiveTicker} />
            <SdkSection />
            <SecuritySection />
            <FaqSection />
            <Closing />
            <Footer />
          </div>
        </>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<Zodiacs />);
