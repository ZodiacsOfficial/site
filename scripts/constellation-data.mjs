// A deliberately small, committed subset of HYG Database v4.0 used to draw
// the twelve Registry constellation maps. Coordinates are J2000 right
// ascension (hours) and declination (degrees); magnitude is apparent visual
// magnitude. Keeping the subset in-repository makes the generated record pages
// deterministic and avoids any runtime astronomy or third-party request.
//
// HYG Database v4.0: https://github.com/astronexus/HYG-Database
// Source file: hyg/CURRENT/hygdata_v40.csv.gz
// Source blob: 681f7d51024c9593182079da9fd1aec897a44e7e
// License: CC BY-SA 4.0 — https://creativecommons.org/licenses/by-sa/4.0/

export const HYG_ATTRIBUTION = Object.freeze({
  title: 'HYG Database v4.0',
  url: 'https://github.com/astronexus/HYG-Database',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  sourceBlob: '681f7d51024c9593182079da9fd1aec897a44e7e',
});

function stars(rows) {
  return rows.trim().split('\n').filter(Boolean).map((row) => {
    const [id, hip, name, bayer, ra, dec, mag] = row.split('|');
    return Object.freeze({
      id,
      hygId: Number(id),
      hip: hip ? Number(hip) : null,
      name: name || null,
      bayer: bayer || null,
      ra: Number(ra),
      dec: Number(dec),
      mag: Number(mag),
      kind: 'star',
      source: 'hyg-v4.0',
    });
  });
}

function constellation({ abbreviation, focusId, stars: starRows, edges }) {
  return Object.freeze({
    abbreviation,
    focusId,
    stars: Object.freeze(stars(starRows)),
    // These segments are a restrained visual guide authored for Zodiacs.org.
    // They are not IAU constellation boundaries or a scientific data product.
    edges: Object.freeze(edges.map((edge) => Object.freeze(edge))),
  });
}

export const CONSTELLATIONS = Object.freeze({
  aries: constellation({
    abbreviation: 'Ari', focusId: '9861',
    stars: `
8813|8832|Mesarthim|Gam-2|1.892170|19.293852|3.88
8884|8903|Sheratan|Bet|1.910668|20.808035|2.64
9861|9884|Hamal|Alp|2.119555|23.462423|2.01
13176|13209|Bharani||2.833063|27.260507|3.61
14802|14838|Botein|Del|3.193822|19.726677|4.35`,
    edges: [['8813', '8884'], ['8884', '9861'], ['9861', '13176'], ['13176', '14802']],
  }),

  taurus: constellation({
    abbreviation: 'Tau', focusId: '21368',
    stars: `
15861|15900||Omi|3.413554|9.028870|3.61
17661|17702|Alcyone|Eta|3.791410|24.105137|2.85
18677|18724||Lam|4.011338|12.490347|3.41
20155|20205|Prima Hyadum|Gam|4.329889|15.627642|3.65
20405|20455|Secunda Hyadum|Del-1|4.382247|17.542514|3.77
20837|20889|Ain|Eps|4.476943|19.180431|3.53
20842|20894|Chamukuy|The-2|4.477705|15.870883|3.40
21368|21421|Aldebaran|Alp|4.598677|16.509301|0.87
25364|25428|Elnath|Bet|5.438198|28.607450|1.65
26386|26451|Tianguan|Zet|5.627413|21.142549|2.97`,
    edges: [['15861', '18677'], ['18677', '20155'], ['20155', '20405'], ['20405', '21368'], ['21368', '20837'], ['21368', '20842'], ['21368', '25364'], ['25364', '26386'], ['17661', '20837']],
  }),

  gemini: constellation({
    abbreviation: 'Gem', focusId: '37718',
    stars: `
29582|29655|Propus|Eta|6.247961|22.506799|3.31
30270|30343|Tejat|Mu|6.382673|22.513586|2.87
31601|31681|Alhena|Gam|6.628528|16.399252|1.93
32161|32246|Mebsuta|Eps|6.732202|25.131124|3.06
34000|34088|Mekbuda|Zet|7.068481|20.570297|4.01
35453|35550|Wasat|Del|7.335383|21.982320|3.50
36744|36850|Castor|Alp|7.576634|31.888276|1.58
37633|37740||Kap|7.740793|24.397993|3.57
37718|37826|Pollux|Bet|7.755277|28.026199|1.16`,
    edges: [['29582', '30270'], ['30270', '34000'], ['34000', '32161'], ['32161', '36744'], ['31601', '35453'], ['35453', '37718'], ['32161', '35453'], ['37718', '37633']],
  }),

  cancer: Object.freeze({
    abbreviation: 'Cnc', focusId: 'praesepe',
    stars: Object.freeze([
      ...stars(`
40411|40526|Tarf|Bet|8.275256|9.185545|3.53
42792|42911|Asellus Australis|Del|8.744750|18.154309|3.94
42984|43103||Iot|8.778284|28.759898|4.03
43939|44066|Acubens|Alp|8.974784|11.857701|4.26`),
      // Praesepe is an open cluster, not a HYG star. Its J2000 centre is
      // included as a clearly typed supplemental marker and cited to SIMBAD.
      Object.freeze({
        id: 'praesepe', hygId: null, hip: null, name: 'Praesepe', bayer: null,
        ra: 8.6728, dec: 19.672, mag: 3.1, kind: 'open-cluster',
        source: 'simbad-m44',
      }),
    ]),
    edges: Object.freeze([
      Object.freeze(['40411', '42792']),
      Object.freeze(['42792', '42984']),
      Object.freeze(['42792', '43939']),
    ]),
  }),

  leo: constellation({
    abbreviation: 'Leo', focusId: '49528',
    stars: `
47373|47508|Subra|Omi|9.685843|9.892308|3.52
47772|47908|Ras Elased Australis|Eps|9.764188|23.774255|2.97
48318|48455|Rasalas|Mu|9.879398|26.006951|3.88
49528|49669|Regulus|Alp|10.139532|11.967207|1.36
50193|50335|Adhafera|Zet|10.278171|23.417311|3.43
50440|50583|Algieba|Gam-1|10.332873|19.841489|2.01
54712|54872|Zosma|Del|11.235138|20.523717|2.56
54718|54879|Chertan|The|11.237335|15.429570|3.33
55476|55642||Iot|11.398736|10.529509|4.00
57459|57632|Denebola|Bet|11.817663|14.572060|2.14`,
    edges: [['47373', '49528'], ['49528', '50440'], ['50440', '50193'], ['50193', '48318'], ['48318', '47772'], ['47772', '50440'], ['50440', '54712'], ['54712', '57459'], ['54712', '54718'], ['54718', '55476'], ['55476', '49528']],
  }),

  virgo: constellation({
    abbreviation: 'Vir', focusId: '65269',
    stars: `
57584|57757|Zavijava|Bet|11.844922|1.764718|3.59
59945|60129|Zaniah|Eta|12.331766|-0.666803|3.89
61748|61941|Porrima|Gam|12.694345|-1.449375|2.74
62890|63090|Minelauva|Del|12.926725|3.397470|3.39
63405|63608|Vindemiatrix|Eps|13.036278|10.959150|2.85
65269|65474|Spica|Alp|13.419883|-11.161322|0.98
66040|66249|Heze|Zet|13.578220|-0.595820|3.38
69479|69701|Syrma|Iot|14.266908|-6.000547|4.07`,
    edges: [['57584', '59945'], ['59945', '61748'], ['61748', '62890'], ['62890', '63405'], ['61748', '66040'], ['66040', '65269'], ['65269', '69479']],
  }),

  libra: constellation({
    abbreviation: 'Lib', focusId: '74556',
    stars: `
72396|72622|Zubenelgenubi|Alp-2|14.847977|-16.041778|2.75
73486|73714|Brachium|Sig|15.067839|-25.281965|3.25
74556|74785|Zubeneschamali|Bet|15.283449|-9.382917|2.61
76100|76333|Zubenelhakrabi|Gam|15.592105|-14.789537|3.91
76235|76470||Ups|15.617070|-28.135079|3.60
77617|77853||The|15.897093|-16.729293|4.13`,
    edges: [['72396', '74556'], ['74556', '76100'], ['76100', '77617'], ['77617', '72396'], ['72396', '73486'], ['73486', '76235']],
  }),

  scorpio: constellation({
    abbreviation: 'Sco', focusId: '80519',
    stars: `
77868|78104|Iklil|Rho|15.948077|-29.214073|3.87
78029|78265|Fang|Pi|15.980865|-26.114105|2.89
78165|78401|Dschubba|Del|16.005557|-22.621710|2.29
78580|78820|Acrab|Bet-1|16.090620|-19.805453|2.56
79870|80112|Alniyat|Sig|16.353143|-25.592796|2.90
80519|80763|Antares|Alp|16.490128|-26.432002|1.06
81020|81266|Paikauhale|Tau|16.598043|-28.216016|2.82
82144|82396|Larawag|Eps|16.836080|-34.293232|2.29
82263|82514|Xamidimura|Mu-1|16.864509|-38.047380|3.00
83885|84143||Eta|17.202552|-43.239189|3.32
85436|85696|Lesath|Ups|17.512732|-37.295811|2.70
85665|85927|Shaula|Lam|17.560145|-37.103821|1.62
85965|86228|Sargas|The|17.621980|-42.997824|1.86
86403|86670||Kap|17.708132|-39.029983|2.39`,
    edges: [['77868', '78029'], ['78029', '78165'], ['78165', '78580'], ['78165', '79870'], ['79870', '80519'], ['80519', '81020'], ['81020', '82144'], ['82144', '82263'], ['82263', '83885'], ['83885', '85965'], ['85965', '86403'], ['86403', '85665'], ['85665', '85436']],
  }),

  sagittarius: constellation({
    abbreviation: 'Sgr', focusId: '89906',
    stars: `
88361|88635|Alnasl|Gam-2|18.096803|-30.424091|2.98
89653|89931|Kaus Media|Del|18.349900|-29.828103|2.72
89906|90185|Kaus Australis|Eps|18.402868|-34.384616|1.79
90217|90496|Kaus Borealis|Lam|18.466179|-25.421700|2.82
92564|92855|Nunki|Sig|18.921090|-26.296722|2.05
93213|93506|Ascella|Zet|19.043532|-29.880105|2.60
93569|93864||Tau|19.115670|-27.670423|3.32
93846|94141|Albaldah|Pi|19.162731|-21.023615|2.88
95052|95347|Rukbat|Alp|19.398103|-40.615940|3.96`,
    edges: [['88361', '89653'], ['89653', '89906'], ['89906', '93213'], ['93213', '92564'], ['92564', '90217'], ['90217', '89653'], ['92564', '93569'], ['93569', '93213'], ['92564', '93846'], ['93213', '95052']],
  }),

  capricorn: constellation({
    abbreviation: 'Cap', focusId: '107213',
    stars: `
99743|100064|Algedi|Alp-2|20.300904|-12.544852|3.58
100020|100345|Dabih|Bet|20.350187|-14.781367|3.05
102154|102485||Psi|20.768260|-25.270898|4.13
102647|102978||Ome|20.863692|-26.919133|4.12
103804|104139||The|21.099118|-17.232861|4.08
105540|105881||Zet|21.444452|-22.411332|3.77
106642|106985|Nashira|Gam|21.668181|-16.662308|3.69
107213|107556|Deneb Algedi|Del|21.784011|-16.127286|2.85`,
    edges: [['99743', '100020'], ['100020', '102154'], ['102154', '102647'], ['102647', '105540'], ['105540', '107213'], ['107213', '106642'], ['106642', '103804'], ['103804', '99743']],
  }),

  aquarius: constellation({
    abbreviation: 'Aqr', focusId: '105936',
    stars: `
102287|102618|Albali|Eps|20.794598|-9.495776|3.78
105936|106278|Sadalsuud|Bet|21.525982|-5.571172|2.90
108728|109074|Sadalmelik|Alp|22.096399|-0.319851|2.95
109657|110003|Ancha|The|22.280565|-7.783290|4.17
110049|110395|Sadachbia|Gam|22.360938|-1.387331|3.86
110614|110960||Zet-1|22.480531|-0.019972|3.65
111147|111497||Eta|22.589272|-0.117498|4.04
112601|112961||Lam|22.876910|-7.579599|3.73
112776|113136|Skat|Del|22.910837|-15.820820|3.27`,
    edges: [['102287', '105936'], ['105936', '108728'], ['108728', '110049'], ['110049', '110614'], ['110614', '111147'], ['108728', '109657'], ['109657', '112601'], ['112601', '112776']],
  }),

  pisces: constellation({
    abbreviation: 'Psc', focusId: '9467',
    stars: `
3778|3786||Del|0.811373|7.585079|4.44
4896|4906||Eps|1.049058|7.890135|4.27
7083|7097|Alpherg|Eta|1.524725|15.345823|3.62
8183|8198|Torcular|Omi|1.756564|9.157736|4.26
9467|9487|Alrescha|Alp|2.034117|2.763759|3.82
113529|113889|Fumalsamakah|Bet|23.064615|3.820045|4.48
114609|114971||Gam|23.286094|3.282289|3.70
115465|115830||The|23.466138|6.378992|4.27
116405|116771||Iot|23.665844|5.626292|4.13
116562|116928||Lam|23.700779|1.780041|4.49
117900|118268||Ome|23.988525|6.863321|4.03`,
    edges: [['3778', '4896'], ['4896', '7083'], ['7083', '8183'], ['8183', '9467'], ['9467', '116562'], ['116562', '113529'], ['113529', '114609'], ['114609', '115465'], ['115465', '116405'], ['116405', '117900'], ['117900', '113529']],
  }),
});

export function validateConstellations(signOrder) {
  const errors = [];
  for (const slug of signOrder) {
    const constellation = CONSTELLATIONS[slug];
    if (!constellation) {
      errors.push(`${slug}: missing constellation`);
      continue;
    }
    const ids = new Set(constellation.stars.map((star) => star.id));
    if (!ids.has(constellation.focusId)) errors.push(`${slug}: missing focus marker ${constellation.focusId}`);
    for (const [from, to] of constellation.edges) {
      if (!ids.has(from) || !ids.has(to)) errors.push(`${slug}: invalid guide segment ${from}–${to}`);
    }
    for (const star of constellation.stars) {
      if (!Number.isFinite(star.ra) || star.ra < 0 || star.ra >= 24) errors.push(`${slug}: invalid RA for ${star.id}`);
      if (!Number.isFinite(star.dec) || star.dec < -90 || star.dec > 90) errors.push(`${slug}: invalid declination for ${star.id}`);
      if (!Number.isFinite(star.mag)) errors.push(`${slug}: invalid magnitude for ${star.id}`);
    }
  }
  return errors;
}
