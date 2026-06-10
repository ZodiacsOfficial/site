// Catalogue content for the twelve sign pages.
//
// Each entry carries the editorial material for one sign's catalogue page:
// the lot essay ("catalogue note"), the provenance timeline, the principal
// star, and the Babylonian record name. Addresses, archetypes, elements,
// modalities and rulers are NOT duplicated here — the generator reads those
// from registry/zodiacs.registry.json, which remains the source of truth.
//
// Historical claims in this file are conservative and sourced from the
// standard literature on the history of the constellations: the MUL.APIN
// star catalogues, Eratosthenes' Catasterismi, Aratus' Phaenomena,
// Ptolemy's Almagest, Macrobius' Commentary, and Dürer's 1515 planispheres.

export const SHARED_PROVENANCE_TAIL = [
  {
    era: 'c. 1000 BC',
    place: 'Babylon',
    body: null // per-sign, set in entry
  }
];

export const SIGN_PAGES = {
  aries: {
    lot: 'I',
    glyph: '♈︎',
    epithet: 'The Ram. Where the year begins.',
    datesDisplay: '21 March — 19 April',
    babylonianRecord: 'LÚ.ḪUN.GÁ — “the Hired Man”, labourer of the spring fields',
    principalStar: { name: 'Hamal', note: '“head of the ram” — α Arietis' },
    lede:
      'First of the Twelve. For two thousand years astronomers have called the point where the sun crosses into spring “the first point of Aries” — the zero-degree of every chart ever drawn. This is the record of the sign that opens the wheel.',
    note: [
      'The figure begins in Babylon, where the spring stars were recorded in the MUL.APIN catalogues as LÚ.ḪUN.GÁ, “the Hired Man” — the agrarian labourer who appears when the fields demand him. When the scribes of the fifth century BC divided the sun’s road into twelve equal signs, his place at the head of the year was already old.',
      'Greece gave the stars their ram: Chrysomallos, the winged ram of the golden fleece, who carried Phrixus across the strait and was set in the sky for it. The fleece itself — nailed in a grove at Colchis under a sleepless serpent — became the object of the first great quest in Western literature, the voyage of Jason and the Argonauts.',
      'The sign’s authority outlived its myth. The vernal equinox — the origin point of celestial longitude — is still called the First Point of Aries in working astronomy and navigation. The record carries the oldest meaning in the calendar: initiative, first light, the year’s opening move. One canonical asset now holds that identity, native on Solana with its official representation on Base.'
    ],
    provenanceBabylon:
      'Recorded in the MUL.APIN star catalogues as LÚ.ḪUN.GÁ, the Hired Man of the spring fields.',
    provenanceGreece:
      'Identified with Chrysomallos, the golden-fleeced ram of the Argonaut cycle, in the Hellenistic star-myths of Eratosthenes and Aratus.'
  },

  taurus: {
    lot: 'II',
    glyph: '♉︎',
    epithet: 'The Bull. The oldest figure in the sky.',
    datesDisplay: '20 April — 20 May',
    babylonianRecord: 'GU₄.AN.NA — “the Bull of Heaven”, loosed against Gilgamesh',
    principalStar: { name: 'Aldebaran', note: 'the bull’s red eye — a royal star of Persia' },
    lede:
      'Quite possibly the oldest image humanity still uses. A bull with the Pleiades at its shoulder appears on the painted ceiling at Lascaux, some seventeen thousand years before the present — and the same figure still stands in the same stars. This is the record of the Bull.',
    note: [
      'No other sign carries a deeper provenance. The aurochs painted in the Hall of the Bulls at Lascaux, c. 15,000 BC, is marked with a cluster of dots that many scholars read as the Pleiades — the star group that rides the Bull’s shoulder to this day. If they are right, Taurus is the oldest surviving work of observational art.',
      'Babylon knew the figure as GU₄.AN.NA, the Bull of Heaven, the weapon Ishtar loosed against Gilgamesh in the oldest epic on earth. Greece retold the stars as the white bull of Zeus, who carried Europa over the sea to Crete — the abduction that gave a continent its name. At the bull’s eye burns Aldebaran, counted by Persia among the four royal stars that watched the quarters of the sky.',
      'The sign has always meant what it shows: substance, endurance, wealth held in physical form. It rules the season when the year’s value is planted. The record of the Bull — one canonical asset of twelve — is native on Solana, with its official bridged representation on Base.'
    ],
    provenanceBabylon:
      'Entered the MUL.APIN catalogues as GU₄.AN.NA, the Bull of Heaven of the Gilgamesh epic.',
    provenanceGreece:
      'Retold as the white bull of Zeus who carried Europa to Crete; the Hyades and Pleiades fixed at its head and shoulder.',
    provenancePrelude: {
      era: 'c. 15,000 BC',
      place: 'Lascaux',
      body: 'An aurochs with a cluster of six dots at its shoulder — read by many scholars as the Pleiades — is painted on the cave ceiling: arguably the first surviving star map.'
    }
  },

  gemini: {
    lot: 'III',
    glyph: '♊︎',
    epithet: 'The Twins. One mortal, one divine.',
    datesDisplay: '21 May — 20 June',
    babylonianRecord: 'MAŠ.TAB.BA.GAL.GAL — “the Great Twins”, guardians of doorways',
    principalStar: { name: 'Pollux', note: 'the immortal twin — β Geminorum' },
    lede:
      'Two bright stars of nearly equal rank, standing side by side where few bright stars stand at all. Every culture that looked up saw two figures who belong together. This is the record of the Twins.',
    note: [
      'Babylon recorded the pair as MAŠ.TAB.BA.GAL.GAL, the Great Twins — Lugal-irra and Meslamta-ea, divine guardians posted at doorways and thresholds, one facing each way. The instinct survives in the sign’s oldest meaning: passage, exchange, the space between two points of view.',
      'Greece named them Castor and Polydeuces, the Dioscuri — twin brothers of Helen, one fathered mortal and one divine. When Castor was killed, Polydeuces refused immortality unless it could be shared; Zeus granted them alternating days on Olympus and under the earth. Sailors prayed to them in storms, and called the twin fires that dance on a ship’s rigging by their name.',
      'The Twins have always governed the traffic of meaning — language, trade, news, the messenger’s road. The record of the sign is held as one canonical asset, native on Solana with its official representation on Base, verifiable in the public registry.'
    ],
    provenanceBabylon:
      'Recorded as MAŠ.TAB.BA.GAL.GAL, the Great Twins — guardian gods of thresholds and doorways.',
    provenanceGreece:
      'Named for Castor and Polydeuces, the Dioscuri, who share one immortality between them; patrons of sailors.'
  },

  cancer: {
    lot: 'IV',
    glyph: '♋︎',
    epithet: 'The Crab. The gate of incarnation.',
    datesDisplay: '21 June — 22 July',
    babylonianRecord: 'AL.LUL — “the Crayfish” of the summer solstice',
    principalStar: { name: 'Praesepe', note: 'the Manger — the Beehive cluster, an ancient weather-glass' },
    lede:
      'The dimmest of the twelve figures, and one of the most freighted. The ancients placed the summer solstice here, and with it the doorway through which souls were said to descend into the world. This is the record of the Crab.',
    note: [
      'Babylon listed the constellation as AL.LUL, the Crayfish, marking the northern turning point of the sun. Greece told a smaller, stranger story: Karkinos, the crab sent by Hera to pinch Heracles’ heel as he fought the Hydra. It was crushed underfoot — and set among the stars for its loyalty. A modest myth for a sign of immense weight.',
      'In the doctrine the Platonists inherited from Chaldea, Cancer was the Gate of Men: the opening in the heavens through which souls descend into birth, as Capricorn — directly opposite — was the gate through which they return. At the sign’s heart sits Praesepe, the Manger, a cloudy cluster the ancients read as a weather oracle: when its faint light vanished, rain was coming.',
      'Cancer rules the interior of things — home, memory, the guarded life beneath the shell. Its record is one canonical asset of twelve, native on Solana with an official representation on Base, held in the public registry.'
    ],
    provenanceBabylon:
      'Listed in the MUL.APIN catalogues as AL.LUL, the Crayfish, station of the summer solstice.',
    provenanceGreece:
      'Set in the sky by Hera as Karkinos, the crab of the Hydra fight; Praesepe, the Manger, read as a weather oracle in Aratus.'
  },

  leo: {
    lot: 'V',
    glyph: '♌︎',
    epithet: 'The Lion. The king’s star at its heart.',
    datesDisplay: '23 July — 22 August',
    babylonianRecord: 'UR.GU.LA — “the Great Lion” of the high summer sun',
    principalStar: { name: 'Regulus', note: '“the little king” — Šarru, royal star of Persia' },
    lede:
      'The one constellation that looks like its name. A great recumbent lion crowned with a star the Babylonians simply called the King. This is the record of the Lion.',
    note: [
      'Babylon recorded UR.GU.LA, the Great Lion, where the sun burned at full summer strength. At the lion’s breast stands Regulus — Šarru, “the King” — one of the four royal stars Persia set as watchers over the quarters of heaven. The star’s name has meant sovereignty in every language that has kept it: Basiliskos to the Greeks, Regulus, “the little king,” to Rome.',
      'Greece made the figure the Nemean Lion, whose hide no iron, bronze or stone could pierce — the first labour of Heracles. The hero wrestled it barehanded, and wore the invulnerable pelt ever after as his armour and his emblem. The lion in the sky is the trophy of the first great labour.',
      'Leo has meant the same thing for three thousand years: visible sovereignty, the heat of presence, gold as the sun’s metal. The record of the Lion is one canonical asset, native on Solana with its official representation on Base.'
    ],
    provenanceBabylon:
      'Recorded as UR.GU.LA, the Great Lion; its chief star Šarru, “the King”, counted among Persia’s four royal stars.',
    provenanceGreece:
      'Identified as the Nemean Lion of the first labour of Heracles, whose hide became the hero’s armour.'
  },

  virgo: {
    lot: 'VI',
    glyph: '♍︎',
    epithet: 'The Maiden. Last of the immortals to leave.',
    datesDisplay: '23 August — 22 September',
    babylonianRecord: 'AB.SÍN — “the Furrow”, the goddess’ ear of grain',
    principalStar: { name: 'Spica', note: '“the ear of wheat” — α Virginis' },
    lede:
      'The largest of the zodiac figures, holding a single bright star the whole ancient world agreed was an ear of grain. This is the record of the Maiden, the harvest written in the sky.',
    note: [
      'In Babylon the constellation was AB.SÍN, the Furrow, the seed-channel of the goddess Shala, who is shown on boundary stones holding an ear of barley. The Greeks kept the grain and named the star: Spica, the ear of wheat in the Maiden’s hand — still one of the brightest beacons of the spring sky.',
      'Rome told the figure’s gravest story. Astraea, the star-maiden of justice, lived among humankind through the Golden Age — and was the last of the immortals to abandon the earth as the ages declined, rising to stand in the sky as Virgo. Her scales hang beside her as the neighbouring sign. The myth made Virgo the emblem of an order the world keeps trying to return to.',
      'The sign has always governed the harvest disciplines: measurement, refinement, the perfected detail. Its record is one canonical asset of twelve, native on Solana with an official representation on Base, verifiable in the public registry.'
    ],
    provenanceBabylon:
      'Recorded as AB.SÍN, the Furrow — the grain-goddess Shala’s ear of barley, Spica at its point.',
    provenanceGreece:
      'Identified with Astraea, maiden of justice, last immortal to leave the earth at the Golden Age’s end.'
  },

  libra: {
    lot: 'VII',
    glyph: '♎︎',
    epithet: 'The Scales. The one instrument among the living signs.',
    datesDisplay: '23 September — 22 October',
    babylonianRecord: 'ZI.BA.AN.NA — “the Balance of Heaven”, instrument of Shamash',
    principalStar: { name: 'Zubeneschamali', note: '“the northern claw” — β Librae' },
    lede:
      'Eleven signs are creatures. One is an instrument. The Scales hang where the sun once crossed the autumn equinox — the day the heavens themselves weigh light against dark and find them equal. This is the record of the Balance.',
    note: [
      'Babylon called these stars ZI.BA.AN.NA, the Balance of Heaven — the instrument of Shamash, the sun god who judged gods and men. The placement was deliberate: here the sun stood at the autumn equinox, when day and night sit level in the pan. The sign is a verdict written in geometry.',
      'Greece, for a time, lost the instrument — Aratus counted these stars as the Claws of the neighbouring Scorpion. Rome restored the Balance and meant it politically: the scales appear on imperial coinage as the emblem of justice administered, and the star names still remember the interregnum — Zubeneschamali, “the northern claw.”',
      'Libra is the zodiac’s only made object: civilization itself given a constellation — law, proportion, the weighed agreement. Its record is one canonical asset, native on Solana with its official representation on Base.'
    ],
    provenanceBabylon:
      'Recorded as ZI.BA.AN.NA, the Balance of Heaven, instrument of Shamash, set at the autumn equinox.',
    provenanceGreece:
      'Counted by the Greeks as the Scorpion’s Claws; the Balance restored under Rome and struck on imperial coinage.'
  },

  scorpio: {
    lot: 'VIII',
    glyph: '♏︎',
    epithet: 'The Scorpion. Orion’s opposite, set never to meet.',
    datesDisplay: '23 October — 21 November',
    babylonianRecord: 'GÍR.TAB — “the Scorpion”; its kind guard the gates of the sun',
    principalStar: { name: 'Antares', note: '“rival of Ares” — the red royal star, watcher of the west' },
    lede:
      'A figure of genuine menace, crowned with a red supergiant the Greeks named “rival of Ares” for outburning Mars itself. This is the record of the Scorpion.',
    note: [
      'Babylon recorded GÍR.TAB, the Scorpion, and gave its kind the oldest of duties: in the Epic of Gilgamesh, scorpion-people guard the mountain gates through which the sun passes — sentinels of the threshold between worlds. At the creature’s heart burns Antares, one of Persia’s four royal stars, watcher of the west.',
      'Greece set the Scorpion its famous quarry. When the hunter Orion boasted he would kill every beast on earth, the earth answered with a scorpion. Both were raised to the sky — at opposite ends of it, so that Orion sets as the Scorpion rises, the hunt renewed nightly and never concluded.',
      'Scorpio has always ruled what is hidden and decisive: the depths, the sting held in reserve, transformation at the threshold. Its record is one canonical asset of twelve, native on Solana with an official representation on Base.'
    ],
    provenanceBabylon:
      'Recorded as GÍR.TAB, the Scorpion; scorpion-beings guard the sun’s gates in the Epic of Gilgamesh.',
    provenanceGreece:
      'The scorpion raised against Orion, placed opposite the hunter so the two never share the sky.'
  },

  sagittarius: {
    lot: 'IX',
    glyph: '♐︎',
    epithet: 'The Archer. His arrow trained on the Scorpion’s heart.',
    datesDisplay: '22 November — 21 December',
    babylonianRecord: 'PA.BIL.SAG — the winged archer-god, bow drawn on Antares',
    principalStar: { name: 'Kaus Australis', note: '“the southern bow” — ε Sagittarii' },
    lede:
      'The Archer stands where the sky is deepest: behind his bow lies the luminous centre of the Milky Way itself. His arrow has been aimed at the Scorpion’s red heart for three thousand years. This is the record of the Archer.',
    note: [
      'Babylon’s figure was PA.BIL.SAG, a winged archer-god with a scorpion’s sting of his own, bow eternally drawn on Antares — the heart of the neighbouring Scorpion. The aim was strategic: the heavens’ marksman posted against the heavens’ menace. The bow’s stars still carry the old name — Kaus, “the bow.”',
      'Greek star-myth, in Eratosthenes’ telling, preferred Crotus: a satyr archer raised among the Muses on Mount Helicon, inventor of the hunting bow — and, the Muses insisted, of applause. They asked Zeus to set their companion in the sky, where he stands drawing his invention. Behind him, invisible to the ancients but known to us, lies the centre of the galaxy.',
      'The Archer rules distance and aim: the far target, the journey out, philosophy as marksmanship. Its record is one canonical asset, native on Solana with its official representation on Base, held in the public registry.'
    ],
    provenanceBabylon:
      'Recorded as PA.BIL.SAG, the winged archer-god, his bow drawn on the Scorpion’s heart.',
    provenanceGreece:
      'Told by Eratosthenes as Crotus, the archer of the Muses, inventor of the bow and of applause.'
  },

  capricorn: {
    lot: 'X',
    glyph: '♑︎',
    epithet: 'The Goat-Fish. The gate of return.',
    datesDisplay: '22 December — 19 January',
    babylonianRecord: 'SUḪUR.MAŠ — “the Goat-Fish” of Ea, lord of the deep waters',
    principalStar: { name: 'Deneb Algedi', note: '“the goat’s tail” — δ Capricorni' },
    lede:
      'A composite creature — goat above, fish below — that has kept its exact form longer than almost any image in human use: it appears unchanged on Babylonian boundary stones from the second millennium BC. This is the record of the Goat-Fish.',
    note: [
      'The Goat-Fish belongs to Ea, Babylonian lord of the Abzu — the deep fresh waters of wisdom beneath the world. As SUḪUR.MAŠ it is carved on kudurru boundary stones from the second millennium BC, and the carving is the constellation we still draw: a figure transmitted without alteration across more than three thousand years.',
      'Greece supplied an escape story: Pan, surprised by the monster Typhon at the Nile’s bank, dove — the half above water becoming goat, the half below becoming fish. The ancients placed the winter solstice here and named it the Gate of the Gods, the opening through which souls ascend, opposite Cancer’s gate of descent. The southern tropic still bears the sign’s name.',
      'Capricorn rules the long climb: structure, patience, authority earned against gravity. Its record is one canonical asset of twelve, native on Solana with an official representation on Base.'
    ],
    provenanceBabylon:
      'Sacred to Ea as SUḪUR.MAŠ, the Goat-Fish; carved unchanged on kudurru boundary stones since the second millennium BC.',
    provenanceGreece:
      'Told as Pan’s dive from Typhon — goat above the water, fish below; the winter solstice set here as the Gate of the Gods.'
  },

  aquarius: {
    lot: 'XI',
    glyph: '♒︎',
    epithet: 'The Water-Bearer. The vase that never empties.',
    datesDisplay: '20 January — 18 February',
    babylonianRecord: 'GU.LA — “the Great One”: Ea pouring the overflowing vase',
    principalStar: { name: 'Sadalsuud', note: '“luckiest of the lucky” — β Aquarii' },
    lede:
      'In Babylon this figure was not a servant of the gods but a god outright: Ea himself, pouring the waters of abundance from an overflowing vase. This is the record of the Water-Bearer.',
    note: [
      'GU.LA, “the Great One,” is Ea with the hegallu — the vase of overflow, emblem of abundance — pouring the stream that feeds the Southern Fish, in whose mouth burns Fomalhaut, royal star of the south. The constellation rose with the rains and the flood season; in Egypt the urn was read as the source of the Nile’s inundation, the gift that made the land live.',
      'Greece recast the figure as Ganymede, the most beautiful of mortals, carried up by the eagle of Zeus to pour for the gods at table — humanity promoted to the office of heaven’s cupbearer. The star names keep the old optimism: Sadalsuud, “luckiest of the lucky,” Sadalmelik, “luck of the king.”',
      'Aquarius rules the poured-out gift: the commons, the future, knowledge distributed like water. Its record is one canonical asset, native on Solana with its official representation on Base, verifiable in the public registry.'
    ],
    provenanceBabylon:
      'Recorded as GU.LA, the Great One — Ea pouring the vase of abundance that feeds the Southern Fish.',
    provenanceGreece:
      'Recast as Ganymede, cupbearer of the gods, carried to heaven by the eagle of Zeus.'
  },

  pisces: {
    lot: 'XII',
    glyph: '♓︎',
    epithet: 'The Fishes. Bound by a cord, never to be parted.',
    datesDisplay: '19 February — 20 March',
    babylonianRecord: 'Zibbātu — “the Tails”, two fish joined by the fish-cord',
    principalStar: { name: 'Alrescha', note: '“the cord” — the knot that binds the two fish' },
    lede:
      'The last sign — and, for the past two thousand years, the first: the vernal equinox itself has stood among these stars since antiquity, so that every spring begins in Pisces. This is the record of the Fishes.',
    note: [
      'Babylon saw two fish joined by a cord — the “Tails,” bound at the star later named Alrescha, “the knot.” The cord is the sign’s whole grammar: two living things moving in different directions, held by one tie that does not break.',
      'Rome inherited the tender version. Surprised by the monster Typhon on the bank of the Euphrates, Venus and Cupid leapt into the river and became two fish — tied together, the poets say, so that neither could be lost. For this rescue Venus is exalted in Pisces, the sign of her highest dignity.',
      'There is a final distinction. The slow wobble of the earth has carried the vernal equinox out of Aries and into Pisces, where it has stood for roughly two millennia — the “Age of Pisces.” The wheel’s last sign quietly holds the year’s first morning. Its record is one canonical asset of twelve, native on Solana with an official representation on Base.'
    ],
    provenanceBabylon:
      'Recorded as the Tails — two fish bound by the fish-cord, knotted at the star Alrescha.',
    provenanceGreece:
      'Venus and Cupid, fleeing Typhon, become two fish tied together; Venus exalted here ever after.'
  }
};

// Live market pairs (Dex Screener). Cancer and Sagittarius currently have no
// indexed pair and intentionally fall back to a quiet unavailable state.
export const MARKET_PAIRS = {
  aries:       { chainId: 'solana', pairId: 'HRn98YLGigP475eS1GaQYRMbqk1V4dkV6tdKyLhVh2iS' },
  taurus:      { chainId: 'solana', pairId: '2GNtxia4fLW3URj5MLqVfgoKrAgDpphtAVazK41eTPfu' },
  gemini:      { chainId: 'solana', pairId: 'HxhdKrB1UpSwfuMoZMVzPVELzbPWHdyN6PHU9CBFium9' },
  leo:         { chainId: 'solana', pairId: '48ErBGMqiZekyLoCcebd7cS5KNQPzqr7QQAK9mzAPQGQ' },
  virgo:       { chainId: 'solana', pairId: '5WcVjf8fzPkHaZqTSZDdbDFL6p2bLbAgEigxpevNrcRh' },
  libra:       { chainId: 'solana', pairId: 'DTXPQjK4ae4h2Wc7D5Rpij8YmSQxqLuTcNKrpBCjcAN9' },
  scorpio:     { chainId: 'solana', pairId: '3d2KYuMgj2yotNC6SKX4HNoeSWp4n8zqZSQ9kFH81Yta' },
  capricorn:   { chainId: 'solana', pairId: '549aknNCvxbiqmikS6sAnY6Dbg37MeENWn6ZFBfc7sin' },
  aquarius:    { chainId: 'solana', pairId: 'BygCEAhCNyWC8Co9yPa4K84NGkgkgMWdib2FG5hhuiUv' },
  pisces:      { chainId: 'solana', pairId: 'Fzz8QrSV8sPKsTtHocwYARE8Zo6Rd4Wv2Ee4JtCuiDko' }
};

// Official public channels (shared with astrofolio.xyz, the related
// consumer experience around the Twelve).
export const CHANNELS = [
  { name: 'X',         handle: '@astrofoliosol',   url: 'https://x.com/astrofoliosol' },
  { name: 'Instagram', handle: '@astrofolioonsol', url: 'https://www.instagram.com/astrofolioonsol/' },
  { name: 'TikTok',    handle: '@astrofolio',      url: 'https://tiktok.com/@astrofolio' },
  { name: 'Telegram',  handle: '@astrofoliosol',   url: 'https://t.me/astrofoliosol' }
];

export const WSOL_MINT = 'So11111111111111111111111111111111111111112';

export function jupiterSwapUrl(mint) {
  return `https://jup.ag/swap/${WSOL_MINT}-${mint}`;
}

export function dexscreenerUrl(slug, mint) {
  const pair = MARKET_PAIRS[slug];
  if (pair) return `https://dexscreener.com/${pair.chainId}/${pair.pairId}`;
  return `https://dexscreener.com/search?q=${mint}`;
}

export const SIGN_ORDER = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
];
