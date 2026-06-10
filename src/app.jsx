    const { useState, useMemo, useEffect, useRef, useCallback } = React;

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
    function loadMarketContext(config) {
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
      return (
        <div className="hdr-wrap">
          <header className="hdr" role="banner">
            <div className="hdr__mark">
              <span>Zodiacs</span><span className="sep">·</span><span className="dim">org</span>
            </div>
            <a className="hdr__nav" href="/sdk/">
              <span>SDK</span>
              <span className="chip">↗</span>
            </a>
          </header>
        </div>
      );
    }

    function Hero({ sign, animKey, active, setActive }) {
      return (
        <section className="hero" id="main">
          <div className="hero__eyebrow">
            <span className="pulse-dot" aria-hidden="true" />
            <span className="label label--gold" style={{ fontSize: 9.5 }}>
              <span className="sr-only">Live. </span>
              The Registry
            </span>
          </div>

          <h1 className="hero__headline">
            Twelve signs.<br/>
            <span className="it">One register.</span>
          </h1>

          <p className="hero__sub">
            One official record for the twelve signs. Verify what belongs,
            where it lives, and how public ownership becomes symbolic context.
          </p>

          <Selector active={active} setActive={setActive} />

          <FeaturedCard sign={sign} animKey={animKey} />
        </section>
      );
    }

    function HeroActions() {
      return (
        <div className="hero__cta hero__cta--below">
          <a className="btn btn--primary" href="#official-twelve">
            <span>Browse the Twelve</span>
            <span className="arr">→</span>
          </a>
          <a className="btn btn--ghost" href="#verify">
            <span>Verify an address</span>
            <span className="arr" style={{ width: 28, height: 28, background: 'transparent', border: 0, color: 'var(--ink-dim)' }}>↗</span>
          </a>
        </div>
      );
    }

    function FeaturedCard({ sign, animKey }) {
      const reveal = useReveal();
      const baseAddr = sign.representations.base.address;
      const solanaMint = sign.representations.solana.address;

      return (
        <article ref={reveal} className="card reveal" aria-label={`Featured sign · ${sign.name}`}>
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
              <img
                className="nugget fade-key"
                key={animKey + '-glyph'}
                src={`assets/nuggets/${sign.name.toLowerCase()}.png`}
                alt={`${sign.name} sculptural figure`}
                fetchpriority="high"
                decoding="async"
              />
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

    // Auto-advance cadence (ms) — must match the CSS @keyframes
    // `strip-countdown` duration. Keep them in lockstep or the visual
    // ring desyncs from the actual hand-off.
    const SELECTOR_CYCLE_MS = 4000;

    function Selector({ active, setActive }) {
      const ref = useRef(null);
      const mounted = useRef(false);
      const [autoplay, setAutoplay] = useState(true);

      // Honour OS-level reduced-motion: disable autoplay outright.
      useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (mq.matches) setAutoplay(false);
        const onChange = () => mq.matches && setAutoplay(false);
        mq.addEventListener?.('change', onChange);
        return () => mq.removeEventListener?.('change', onChange);
      }, []);

      // Pause autoplay while the tab is backgrounded.
      const [tabVisible, setTabVisible] = useState(
        typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
      );
      useEffect(() => {
        const onVis = () => setTabVisible(document.visibilityState === 'visible');
        document.addEventListener('visibilitychange', onVis);
        return () => document.removeEventListener('visibilitychange', onVis);
      }, []);

      // Pause autoplay when the strip scrolls off-screen, so the
      // featured card doesn't quietly change underneath a user who
      // has scrolled down to read the museum label or catalog.
      const [stripVisible, setStripVisible] = useState(true);
      useEffect(() => {
        const node = ref.current?.parentElement; // .strip-wrap
        if (!node || typeof IntersectionObserver === 'undefined') return;
        const io = new IntersectionObserver(
          ([entry]) => setStripVisible(entry.isIntersecting),
          { threshold: 0.4 }
        );
        io.observe(node);
        return () => io.disconnect();
      }, []);

      // Drive the rotation. Each active ticker change resets the timer,
      // so the countdown ring always starts fresh on the new sign.
      const running = autoplay && tabVisible && stripVisible;
      useEffect(() => {
        if (!running) return;
        const id = setTimeout(() => {
          const idx = SIGNS.findIndex(s => s.ticker === active);
          const next = SIGNS[(idx + 1) % SIGNS.length].ticker;
          setActive(next);
        }, SELECTOR_CYCLE_MS);
        return () => clearTimeout(id);
      }, [active, running, setActive]);

      // First manual interaction stops autoplay for the session. Both
      // direct taps and drag/scroll of the strip count as "user took
      // control", and from then on the page respects the user's pick.
      const stopAutoplay = () => setAutoplay(false);

      useEffect(() => {
        const strip = ref.current;
        if (!strip) return;
        const handler = () => stopAutoplay();
        strip.addEventListener('pointerdown', handler, { once: true, passive: true });
        strip.addEventListener('wheel',       handler, { once: true, passive: true });
        return () => {
          strip.removeEventListener('pointerdown', handler);
          strip.removeEventListener('wheel',       handler);
        };
      }, []);

      // Horizontal-only centering — never touch page vertical scroll.
      useEffect(() => {
        const strip = ref.current;
        const el = strip?.querySelector('.is-active');
        if (!strip || !el) return;
        const target =
          el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2;
        strip.scrollTo({
          left: Math.max(0, target),
          behavior: mounted.current ? 'smooth' : 'auto',
        });
        mounted.current = true;
      }, [active]);

      const handlePick = (ticker) => {
        stopAutoplay();
        setActive(ticker);
      };

      return (
        <section
          className={'strip-wrap' + (running ? ' is-autoplay' : '')}
          aria-label="Zodiac selector"
        >
          <div className="strip" ref={ref}>
            {SIGNS.map(s => {
              const isActive = active === s.ticker;
              return (
                <button
                  key={s.ticker}
                  className={'strip__glyph' + (isActive ? ' is-active' : '')}
                  onClick={() => handlePick(s.ticker)}
                  aria-pressed={isActive}
                  aria-label={s.name}
                  title={s.name}
                >
                  <img
                    src={`assets/icons/${s.name.toLowerCase()}.png`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              );
            })}
          </div>
          <div className="strip__sub">
            <span className="chev" aria-hidden="true">‹</span>
            <span>
              {running ? 'Auto-rotating · tap to pin' : 'Scroll or drag to explore'}
            </span>
            <span className="chev" aria-hidden="true">›</span>
          </div>
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
        { k: 'Safe',       v: 'Lookup' },
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
            <span className="sec__no">№ 01</span>
            <span className="line" />
            <h2 className="sec__title">Registry</h2>
          </div>
          <p className="sec__lede">
            Each sign has one identity. The original asset lives on Solana;
            its official Base counterpart points back to that origin. The
            registry is the source of truth for both.
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
        if (!hit) { setResult({ state: 'not-found', queried: norm(input) }); return; }
        setResult({ state: 'official-' + hit.network, sign: hit.sign, network: hit.network, queried: norm(input) });
      };
      const onClear = () => { setInput(''); setResult(null); };
      // Pick three "try-one" examples so the section demonstrates itself.
      const examples = ['LEO', 'CANCER', 'PISCES'].map(t => SIGNS.find(s => s.ticker === t));

      return (
        <section ref={reveal} id="verify" className="sec reveal" aria-label="Verify">
          <div className="sec__head">
            <span className="sec__no">№ 02</span>
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
                    <span>Not among the Twelve.</span>
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
              src={`assets/icons/${sign.name.toLowerCase()}.png`}
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
      const config = signKey ? ZODIAC_MARKET_PAIRS[signKey] : null;
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
            : '';
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
                Third-party market context. May be delayed or unavailable.
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
            <span className="sec__no">№ 03</span>
            <span className="line" />
            <h2 className="sec__title">Museum label</h2>
          </div>

          <article className="detail fade-key" key={animKey + '-detail'}>
            <img
              className="detail__symbol"
              src={`assets/icons/${sign.name.toLowerCase()}.png`}
              alt=""
              decoding="async"
            />
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

            <a className="detail__entry" href={`/${sign.asset.sign}/`}>
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
            <span className="label label--gold">№ 04 · Thesis</span>
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
        </section>
      );
    }

    function IdentityContextSection() {
      const reveal = useReveal();
      const cards = [
        {
          t: 'Verified Ownership',
          d: 'Confirm whether a wallet holds official Zodiacs.org assets across native Solana and bridged Base representations.'
        },
        {
          t: 'Symbolic Composition',
          d: 'Turn held signs into element mix, modality mix, wheel coverage, and seasonal context.'
        },
        {
          t: 'Built For Experiences',
          d: 'Build profiles, receipts, seasonal moments, verifiers, and identity surfaces on app-neutral infrastructure.'
        }
      ];
      const facts = [
        { k: 'Shelf', v: '4 signs held' },
        { k: 'Composition', v: 'Fire and water dominant' },
        { k: 'Season', v: 'Current season represented' },
        { k: 'Provenance', v: 'Native on Solana · bridged to Base' }
      ];

      return (
        <section ref={reveal} id="identity" className="sec idctx reveal" aria-label="Identity Context">
          <div className="sec__head">
            <span className="sec__no">№ 05</span>
            <span className="line" />
            <span className="sec__title">Identity Context</span>
          </div>

          <h2 className="idctx__statement">
            Not just addresses.<br/>
            <span className="it">A symbolic layer.</span>
          </h2>

          <p className="idctx__copy">
            The SDK turns verified public ownership into display-ready symbolic
            context: held signs, element balance, modality balance, current
            season, native and bridged representations, and wheel coverage.
            Apps can use this foundation to build profiles, receipts, seasonal
            experiences, and astrology-native interfaces without custody,
            signing, or transactions.
          </p>

          <div className="idctx__grid">
            {cards.map((card, i) => (
              <article className="idctx__card" key={card.t}>
                <span className="idctx__num">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="idctx__card-title">{card.t}</h3>
                <p className="idctx__card-copy">{card.d}</p>
              </article>
            ))}
          </div>

          <div className="idctx__example">
            <div className="idctx__example-head">
              <div className="idctx__example-title">Public Zodiacs shelf</div>
              <div className="idctx__example-sub">Example view</div>
            </div>
            <div className="idctx__receipt">
              {facts.map((fact) => (
                <div className="idctx__fact" key={fact.k}>
                  <div className="idctx__fact-k">{fact.k}</div>
                  <div className="idctx__fact-v">{fact.v}</div>
                </div>
              ))}
            </div>
            <p className="idctx__note">
              The SDK provides computed symbolic context and public ownership
              state. The interface chooses how to present it.
            </p>
          </div>
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
            <span className="sec__no">№ 06</span>
            <span className="line" />
            <span className="sec__title">Onchain access</span>
          </div>

          <h2 className="access__statement">
            Access Zodiacs across<br/>
            <span className="it">leading onchain apps.</span>
          </h2>

          <p className="access__copy">
            Find and verify official Zodiac token records through major Solana,
            Base, and wallet interfaces. Always confirm official mint addresses
            through the Zodiacs.org registry.
          </p>

          <div className="access__primary" role="list">
            {ACCESS_PRIMARY.map(v => (
              <a className="access__card access__card--featured" role="listitem" key={v.name}
                 href={v.url} rel="noopener noreferrer">
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
                   href={v.url} rel="noopener noreferrer">
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
        'Identity receipts',
        'Zodiac wheel views',
        'Birth chart overlays',
        'Wallet integrations',
        'Gallery integrations',
        'Public profiles',
        'Share cards',
        'Read-only ownership',
        'Seasonal context'
      ];

      return (
        <section ref={reveal} id="builders" className="sec builders reveal" aria-label="For Builders">
          <div className="sec__head">
            <span className="sec__no">№ 07</span>
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
            galleries, profiles, share cards, and read-only ownership
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
          d: 'Turn public ownership into badges, wheel coverage, composition, and identity surfaces.'
        },
        {
          t: 'Identity layers',
          d: 'Give downstream interfaces a shared symbolic record to build around.'
        },
        {
          t: 'Social moments',
          d: 'Create identity receipts, seasonal cards, and lightweight public displays.'
        },
        {
          t: 'AI astrology assistants',
          d: 'Ground symbolic interfaces in verified facts instead of loose address lists.'
        }
      ];

      return (
        <section ref={reveal} id="built-with-zodiacs" className="sec built reveal" aria-label="Built With Zodiacs">
          <div className="sec__head">
            <span className="sec__no">№ 08</span>
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
            <span className="sec__no">№ 09</span>
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
                  <span className="cat__no">№ {String(s.order).padStart(2, '0')} / 12</span>
                </div>
                <button
                  type="button"
                  className="cat__sym cat__sym--button"
                  onClick={() => {
                    setActive(s.ticker);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  aria-label={`Feature ${s.name}`}
                >
                  <img
                    src={`assets/nuggets/thumb/${s.name.toLowerCase()}.png`}
                    alt={`${s.name} figure`}
                    loading="lazy"
                    decoding="async"
                  />
                </button>
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
                <a className="cat__entry" href={`/${s.asset.sign}/`}>
                  <span>Catalogue entry</span>
                  <span className="cat__entry-arr" aria-hidden="true">→</span>
                </a>
              </div>
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
        { t: 'Read', d: 'Read public ownership state without custody, signing, or transactions.' },
        { t: 'Compose', d: 'Shape held signs into seasonal context, wheel coverage, and identity surfaces.' },
      ];
      return (
        <section ref={reveal} id="sdk" className="sec reveal" aria-label="SDK">
          <div className="sec__head">
            <span className="sec__no">№ 10</span>
            <span className="line" />
            <h2 className="sec__title">SDK</h2>
          </div>
          <p className="sec__lede">
            The SDK is the public interface to the same registry shown here.
            It gives apps verified facts for recognition, ownership display,
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
            <span className="sec__no">№ 11</span>
            <span className="line" />
            <h2 className="sec__title">Read-only by design</h2>
          </div>
          <p className="sec__statement">
            The tools are made for recognition and display. They can read public
            information, but they cannot sign, hold, move, approve, or exchange
            assets.
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

    function FaqSection() {
      const reveal = useReveal();
      const qa = [
        { q: 'What is Zodiacs.org?',
          a: 'The official public registry for the twelve Zodiacs: their identities, records, origin, and verified representations.' },
        { q: 'What can I do here?',
          a: 'Explore the Twelve, verify an address, inspect the public registry, and see how ownership can become symbolic identity context.' },
        { q: 'What can be built with Zodiacs?',
          a: 'Profiles, galleries, wallet views, Zodiac shelves, identity receipts, zodiac wheel views, seasonal moments, and astrology-native interfaces.' },
        { q: 'Where does Astrofolio fit?',
          a: 'Astrofolio is a related consumer experience around personal Zodiac shelves and symbolic ownership. Zodiacs.org remains the official registry and SDK source of truth.' },
        { q: 'What does the SDK add?',
          a: 'It gives apps a read-only way to recognize official Zodiacs, show records, read public ownership, and compute display-ready symbolic context.' },
        { q: 'What is Market Context?',
          a: 'Optional third-party context from Dex Screener. It may be delayed or unavailable and is secondary to identity, registry, and verification.' },
        { q: 'Why Solana and Base?',
          a: 'The original Zodiacs live on Solana. The Base records are official bridged counterparts that point back to those Solana origins.' },
        { q: 'Does the site or SDK move assets?',
          a: 'No. The site and SDK are read-only.' },
        { q: 'Does Zodiacs claim ownership of astrology?',
          a: 'No. Zodiacs keeps the register for these twelve assets. It makes no claim over astrology, the signs, or their symbols.' },
        { q: 'What if an address is not listed?',
          a: 'The verifier reports that it is not among the Twelve.' },
      ];
      return (
        <section ref={reveal} id="faq" className="sec reveal" aria-label="Questions">
          <div className="sec__head">
            <span className="sec__no">№ 12</span>
            <span className="line" />
            <h2 className="sec__title">Questions</h2>
          </div>
          <dl className="faq">
            {qa.map((item, i) => (
              <div className="faq__item" key={i}>
                <dt className="faq__q">{item.q}</dt>
                <dd className="faq__a">{item.a}</dd>
              </div>
            ))}
          </dl>
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
          </div>
            <div>Read-only</div>
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
            <span>Zodiacs.org · Official registry · MMXXVI</span>
          </div>
        </footer>
      );
    }

    // ──────────────────────────────────────────────────────────────
    // Root
    // ──────────────────────────────────────────────────────────────
    function Zodiacs() {
      const [activeTicker, setActiveTicker] = useState('LEO');
      const sign = useMemo(
        () => SIGNS.find(s => s.ticker === activeTicker) ?? SIGNS[0],
        [activeTicker]
      );

      return (
        <>
          <a href="#main" className="skip">Skip to content</a>
          <div className="stars" aria-hidden="true" />
          <div className="grain" aria-hidden="true" />
          <div className="zd">
            <Header />
            <Hero
              sign={sign}
              animKey={activeTicker}
              active={activeTicker}
              setActive={setActiveTicker}
            />
            <HeroActions />
            <RegistrySection />
            <VerifierSection />
            <DetailPanel sign={sign} animKey={activeTicker} />
            <Philosophy />
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
