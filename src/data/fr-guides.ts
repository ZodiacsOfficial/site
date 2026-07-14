import type { Sign } from '../lib/signs';

export interface FrenchGuide {
  sign: string;
  title: string;
  description: string;
  intro: string[];
  sections: { heading: string; body: string[]; risingProfile?: boolean }[];
  faq: { q: string; a: string }[];
}

interface Profile {
  name: string;
  dates: string;
  elementMode: string;
  ruler: string;
  core: string;
  strength: string;
  shadow: string;
  love: string;
  friendship: string;
  work: string;
  purpose: string;
  sun: string;
  moon: string;
  rising: string;
  venus: string;
  mars: string;
  house: string;
  ease: string;
  tension: string;
  care: string;
  privateTruth: string;
}

const EDGE_COPY = 'Si tu es né·e près d’un changement de signe, calcule ton thème astral : le Soleil ne change pas de signe à la même heure chaque année.';

const PROFILES: Record<string, Profile> = {
  aries: {
    name: 'Bélier', dates: 'du 21 mars au 19 avril', elementMode: 'feu cardinal', ruler: 'Mars',
    core: 'un élan franc, rapide et tourné vers l’action',
    strength: 'lancer ce que les autres hésitent encore à commencer et rendre une possibilité concrète',
    shadow: 'confondre urgence et vérité, ou abandonner dès que l’élan du début retombe',
    love: 'du désir clair, du jeu, de l’honnêteté et une personne qui ne cherche pas à éteindre son impulsion',
    friendship: 'des liens vivants, des projets spontanés et des personnes capables de dire oui sans former un comité',
    work: 'ouvrir la voie, résoudre les urgences et faire avancer les projets sans attendre une permission parfaite',
    purpose: 'apprendre à commencer sans s’épuiser, à diriger sans écraser et à choisir les combats qui valent son feu',
    sun: 'une identité qui se découvre en agissant', moon: 'des émotions immédiates qui montent vite et repartent souvent aussi vite',
    rising: 'une présence directe, vive et physique', venus: 'un amour qui fait le premier pas et préfère une étincelle honnête à un lien tiède',
    mars: 'un désir visible, compétitif et peu patient face aux détours', house: 'le domaine où tu réclames autonomie, décision et droit d’essayer',
    ease: 'Le Lion, le Sagittaire et les Gémeaux nourrissent souvent son enthousiasme', tension: 'Le Cancer, le Capricorne et la Balance lui apprennent la pause, l’attention et la négociation',
    care: 'bouger, transpirer, se reposer après l’effort et trouver une sortie saine à la colère',
    privateTruth: 'Le Bélier ne veut pas toujours gagner ; il veut souvent se sentir vivant et libre d’essayer',
  },
  taurus: {
    name: 'Taureau', dates: 'du 20 avril au 20 mai', elementMode: 'terre fixe', ruler: 'Vénus',
    core: 'un rythme calme, sensoriel et remarquablement constant',
    strength: 'rendre la vie habitable en prenant soin des corps, des rythmes, des ressources et des liens',
    shadow: 'rester trop longtemps là où rien ne pousse plus parce que le connu semble plus sûr',
    love: 'de la loyauté, du contact, de la cohérence et des gestes perceptibles dans la vie quotidienne',
    friendship: 'des liens fiables, de bons repas, de la musique, des souvenirs et une présence sans hâte',
    work: 'construire de la valeur, soutenir les processus et améliorer le concret avec patience et goût',
    purpose: 'comprendre que la stabilité n’est pas l’immobilité, mais une base depuis laquelle le désir peut respirer',
    sun: 'une identité qui a besoin de temps, de corps et de valeurs claires', moon: 'des émotions qui s’apaisent grâce à la sécurité, au contact et à la routine',
    rising: 'une présence tranquille, solide et difficile à presser', venus: 'un amour sensuel et patient, attentif au plaisir et aux soins concrets',
    mars: 'un désir lent à démarrer mais doté d’une grande endurance', house: 'le domaine où tu recherches calme, sécurité intérieure et plaisirs simples',
    ease: 'La Vierge, le Capricorne et le Cancer comprennent souvent son besoin de confiance', tension: 'Le Lion, le Verseau et le Scorpion apportent intensité, fierté et besoin de souplesse',
    care: 'dormir régulièrement, bien manger, toucher, marcher dans la nature et répondre sans précipitation',
    privateTruth: 'Le Taureau ne s’accroche pas par principe ; il protège souvent ce qu’il lui a fallu du temps pour aimer',
  },
  gemini: {
    name: 'Gémeaux', dates: 'du 21 mai au 20 juin', elementMode: 'air mutable', ruler: 'Mercure',
    core: 'une curiosité mobile, verbale et capable de voir plusieurs angles à la fois',
    strength: 'relier les personnes et les idées, puis donner des mots à ce qui paraissait dispersé',
    shadow: 'bouger si vite qu’une question importante n’a jamais le temps de devenir une connaissance profonde',
    love: 'de la conversation, de l’humour, de la liberté mentale et un lien qui ne punit pas la curiosité',
    friendship: 'des échanges vifs, des intérêts multiples et des personnes qui acceptent que les idées évoluent',
    work: 'communiquer, traduire, enseigner, enquêter, écrire et repérer les motifs en mouvement',
    purpose: 'transformer l’information en langage utile sans perdre le plaisir de poser des questions',
    sun: 'une identité qui se construit par l’apprentissage et l’échange', moon: 'des émotions qui ont besoin de parler, d’écrire ou de bouger pour se comprendre',
    rising: 'une présence vive, accessible et attentive à tout ce qui circule', venus: 'un amour joueur qui se nourrit de mots, de surprises et de complicité mentale',
    mars: 'un désir nerveux qui débat, teste et cherche de nouveaux stimuli', house: 'le domaine où tu dois questionner, nommer et garder plusieurs chemins ouverts',
    ease: 'La Balance, le Verseau et le Bélier leur offrent air, élan et mouvement partagé', tension: 'La Vierge, les Poissons et le Sagittaire confrontent détail, rêve et vérité',
    care: 'réduire les écrans le soir, marcher, respirer et offrir à l’esprit des moments sans performance',
    privateTruth: 'Les Gémeaux ne changent pas d’avis parce qu’ils ne ressentent rien, mais parce qu’ils perçoivent trop pour feindre une réponse unique',
  },
  cancer: {
    name: 'Cancer', dates: 'du 21 juin au 22 juillet', elementMode: 'eau cardinale', ruler: 'la Lune',
    core: 'une sensibilité intuitive, protectrice et attentive aux atmosphères',
    strength: 'créer un refuge, se souvenir, nourrir et reconnaître les besoins avant qu’ils aient des mots',
    shadow: 'attendre que les autres devinent ce qui fait mal ou dresser une carapace lorsqu’une demande suffirait',
    love: 'de la tendresse fiable, une mémoire partagée, de la réciprocité et un foyer symbolique',
    friendship: 'des liens loyaux, des conversations intimes et des personnes sensibles aux petits gestes',
    work: 'prendre soin, conserver, soutenir les équipes, raconter la mémoire et protéger ce qui est vulnérable',
    purpose: 'transformer la sensibilité en force relationnelle sans faire du soin une façon de disparaître',
    sun: 'une identité organisée autour de l’appartenance, de la mémoire et de la protection', moon: 'une vie émotionnelle puissante qui réclame sécurité et permission de ressentir',
    rising: 'une présence sensible, observatrice et d’abord prudente', venus: 'un amour nourricier, attentif et teinté de nostalgie',
    mars: 'une action protectrice qui défend les proches et préfère parfois contourner avant d’affronter', house: 'le domaine où tu cherches foyer, intimité et lien honnête avec tes racines',
    ease: 'Le Scorpion, les Poissons et le Taureau reconnaissent souvent sa profondeur et sa loyauté', tension: 'Le Bélier, la Balance et le Capricorne lui enseignent indépendance, dialogue et structure',
    care: 'manger simplement, se reposer, retrouver l’eau et poser des limites au tumulte des autres',
    privateTruth: 'Le Cancer n’est pas fragile ; il est perméable, et doit donc choisir avec soin qui peut entrer',
  },
  leo: {
    name: 'Lion', dates: 'du 23 juillet au 22 août', elementMode: 'feu fixe', ruler: 'le Soleil',
    core: 'une chaleur expressive, créative et fière de ce qu’elle aime',
    strength: 'donner vie à une scène, encourager, célébrer et rappeler aux autres qu’ils peuvent aussi rayonner',
    shadow: 'dépendre du regard extérieur ou confondre la fierté avec une protection nécessaire',
    love: 'être choisi avec joie, jouer, recevoir une attention réelle et donner de l’affection sans être utilisé',
    friendship: 'des liens généreux, loyaux et capables de célébrer sans rivalité cachée',
    work: 'diriger, créer, enseigner, concevoir des expériences et porter une vision avec cœur',
    purpose: 'créer depuis son propre centre plutôt que depuis un besoin d’approbation',
    sun: 'une identité vive qui cherche à devenir l’auteur de sa propre histoire', moon: 'des émotions qui demandent chaleur, reconnaissance et place pour le cœur',
    rising: 'une présence rayonnante, théâtrale ou naturellement visible', venus: 'un amour expressif, loyal et heureux de célébrer l’autre',
    mars: 'un désir fier, créatif et déterminé à agir avec panache', house: 'le domaine où tu veux jouer, créer, diriger et montrer quelque chose qui porte ta signature',
    ease: 'Le Bélier, le Sagittaire et la Balance alimentent souvent son élan et sa générosité', tension: 'Le Taureau, le Scorpion et le Verseau font apparaître les conflits de fierté et de volonté',
    care: 'créer pour le plaisir, bouger, rire et recevoir une affection qui ne dépend pas de la performance',
    privateTruth: 'Le Lion ne cherche pas seulement l’attention ; il veut savoir que ce qu’il donne a vraiment touché quelqu’un',
  },
  virgo: {
    name: 'Vierge', dates: 'du 23 août au 22 septembre', elementMode: 'terre mutable', ruler: 'Mercure',
    core: 'un regard précis, pratique et tourné vers ce qui peut être amélioré',
    strength: 'voir les détails oubliés, organiser le réel et rendre les idées véritablement utiles',
    shadow: 'laisser l’exigence devenir une critique permanente de soi ou des autres',
    love: 'de la fiabilité, des mots précis et la reconnaissance des soins discrets du quotidien',
    friendship: 'des liens honnêtes, utiles et assez sûrs pour ne pas exiger la perfection',
    work: 'analyser, éditer, soigner, organiser et transformer un système flou en méthode fiable',
    purpose: 'mettre l’intelligence au service de la vie sans traiter chaque imperfection comme une urgence',
    sun: 'une identité qui se renforce en affinant ses compétences et ses habitudes', moon: 'des émotions qui cherchent de l’ordre, des preuves de soin et des gestes concrets',
    rising: 'une présence attentive, réservée et rapidement consciente des détails', venus: 'un amour sélectif qui s’exprime souvent par l’aide et la constance',
    mars: 'un désir méthodique qui avance en corrigeant et en perfectionnant', house: 'le domaine où tu tries, ajustes, entretiens et rends les choses plus justes',
    ease: 'Le Taureau, le Capricorne et le Cancer comprennent son besoin de cohérence et de soin', tension: 'Les Gémeaux, le Sagittaire et les Poissons confrontent analyse, liberté et sensibilité',
    care: 'installer des routines souples, reposer le système nerveux et accepter ce qui est suffisamment bien',
    privateTruth: 'La Vierge ne corrige pas toujours pour contrôler ; elle essaie souvent d’aimer en rendant la vie plus praticable',
  },
  libra: {
    name: 'Balance', dates: 'du 23 septembre au 22 octobre', elementMode: 'air cardinal', ruler: 'Vénus',
    core: 'un sens fin des relations, de la proportion et de ce qui rend une rencontre équitable',
    strength: 'créer un espace où plusieurs voix peuvent exister sans que la beauté efface la vérité',
    shadow: 'retarder un choix en attendant qu’aucune option ne blesse ou ne déçoive personne',
    love: 'de la réciprocité, de la conversation, de la beauté et le sentiment d’être choisi librement',
    friendship: 'des liens élégants, curieux et capables de parler des tensions sans perdre le respect',
    work: 'négocier, relier, concevoir, arbitrer et rendre un système plus harmonieux et plus juste',
    purpose: 'apprendre que la paix véritable demande parfois une décision inconfortable',
    sun: 'une identité qui se découvre dans la relation, le contraste et le choix', moon: 'des émotions qui cherchent accord, dialogue et atmosphère apaisée',
    rising: 'une présence sociable, gracieuse et attentive aux réactions de l’autre', venus: 'un amour raffiné qui valorise l’échange et le plaisir partagé',
    mars: 'un désir qui pèse les options avant d’agir et préfère la stratégie au choc frontal', house: 'le domaine où tu apprends par la coopération, le miroir et la recherche d’équilibre',
    ease: 'Les Gémeaux, le Verseau et le Lion soutiennent souvent sa sociabilité et sa créativité', tension: 'Le Cancer, le Capricorne et le Bélier mettent à l’épreuve son rapport au soin, à la structure et à l’autonomie',
    care: 'faire des choix simples, chercher la beauté et laisser un désaccord exister sans le réparer aussitôt',
    privateTruth: 'La Balance n’est pas indécise par vide ; elle voit souvent des conséquences que les autres ne regardent pas',
  },
  scorpio: {
    name: 'Scorpion', dates: 'du 23 octobre au 21 novembre', elementMode: 'eau fixe', ruler: 'Mars dans la tradition et Pluton dans l’astrologie moderne',
    core: 'une intensité réservée, lucide et sensible à tout ce qui se joue sous la surface',
    strength: 'traverser les crises, garder les secrets et transformer la vérité difficile en force',
    shadow: 'faire de la protection un isolement ou tester la loyauté jusqu’à épuiser la confiance',
    love: 'de la profondeur, une intimité honnête et la certitude que les sujets difficiles peuvent être nommés',
    friendship: 'des liens peu nombreux mais solides, capables de tenir le silence et la vérité',
    work: 'enquêter, comprendre les motivations, gérer les crises et accompagner les transformations profondes',
    purpose: 'apprendre qu’un pouvoir partagé peut être plus solide qu’un contrôle gardé en secret',
    sun: 'une identité qui se révèle dans l’engagement, la vérité et la transformation', moon: 'des émotions profondes qui réclament confiance et temps avant de se montrer',
    rising: 'une présence magnétique, contenue et difficile à lire', venus: 'un amour entier qui préfère l’intimité réelle aux liens décoratifs',
    mars: 'un désir stratégique, persistant et rarement révélé avant d’être décidé', house: 'le domaine où tu enquêtes, perds, reconstruis et apprends à faire confiance',
    ease: 'Le Cancer, les Poissons et la Vierge respectent souvent son besoin de profondeur', tension: 'Le Lion, le Verseau et le Taureau font surgir les questions de contrôle, de fierté et de résistance',
    care: 'protéger son intimité, libérer le corps de la tension et parler avant que le silence ne devienne une arme',
    privateTruth: 'Le Scorpion ne veut pas toujours contrôler ; il veut souvent être sûr que la vérité ne disparaîtra pas au premier inconfort',
  },
  sagittarius: {
    name: 'Sagittaire', dates: 'du 22 novembre au 21 décembre', elementMode: 'feu mutable', ruler: 'Jupiter',
    core: 'un tempérament ouvert, direct et orienté vers l’horizon',
    strength: 'élargir le monde par le voyage, l’humour, l’étude et les questions qui donnent du sens',
    shadow: 'prendre la fuite lorsque la liberté réclame soudain de la présence et de la continuité',
    love: 'de l’espace, une aventure partagée, de l’honnêteté et une personne qui possède son propre horizon',
    friendship: 'des liens francs, drôles et capables de transformer une idée en départ',
    work: 'enseigner, explorer, publier, relier des cultures et donner une vision plus large aux projets',
    purpose: 'apprendre que la vérité gagne en force lorsqu’elle voyage avec du tact et de la responsabilité',
    sun: 'une identité nourrie par l’exploration, le sens et la possibilité d’aller plus loin', moon: 'des émotions qui respirent grâce au mouvement, à l’espoir et à la perspective',
    rising: 'une présence ouverte, directe et souvent optimiste', venus: 'un amour aventureux qui a besoin d’admirer la liberté de l’autre',
    mars: 'un désir enthousiaste qui agit pour une conviction et supporte mal l’enfermement', house: 'le domaine où tu cherches vérité, enseignement, voyage et expansion',
    ease: 'Le Bélier, le Lion et le Verseau partagent souvent son enthousiasme et son besoin d’espace', tension: 'La Vierge, les Poissons et les Gémeaux confrontent détail, sensibilité et dispersion',
    care: 'marcher loin, apprendre, rire et tenir quelques engagements assez longtemps pour qu’ils portent leurs fruits',
    privateTruth: 'Le Sagittaire ne fuit pas toujours l’intimité ; il fuit surtout l’idée qu’aimer devrait réduire le monde',
  },
  capricorn: {
    name: 'Capricorne', dates: 'du 22 décembre au 19 janvier', elementMode: 'terre cardinale', ruler: 'Saturne',
    core: 'une force contenue, stratégique et consciente du temps',
    strength: 'bâtir ce qui dure, assumer les responsabilités et donner une structure aux ambitions',
    shadow: 'transformer l’autonomie en solitude ou mesurer sa valeur uniquement à ce qui est accompli',
    love: 'de la loyauté, du respect, des projets durables et des actes qui résistent au temps',
    friendship: 'des liens fiables, discrets et capables de rester présents pendant les périodes exigeantes',
    work: 'planifier, diriger, construire des systèmes et porter des objectifs à long terme',
    purpose: 'comprendre que la maturité inclut le repos, l’aide et une vie qui ne se réduit pas au rendement',
    sun: 'une identité qui cherche maîtrise, crédibilité et résultats durables', moon: 'des émotions réservées qui ont besoin de fiabilité avant de demander du soutien',
    rising: 'une présence sobre, ambitieuse et plus chaleureuse avec le temps', venus: 'un amour sérieux qui s’exprime par la constance et les décisions communes',
    mars: 'un désir discipliné, patient et capable de gravir longtemps la même pente', house: 'le domaine où tu apprends la responsabilité, les limites et la maîtrise',
    ease: 'Le Taureau, la Vierge et le Scorpion reconnaissent souvent sa profondeur et sa constance', tension: 'Le Bélier, la Balance et le Cancer mettent en jeu vitesse, relation et vulnérabilité',
    care: 'prévoir du repos, demander de l’aide et se souvenir que la lenteur n’est pas un échec',
    privateTruth: 'Le Capricorne ne veut pas seulement réussir ; il veut être sûr que ce qu’il construit pourra soutenir quelqu’un',
  },
  aquarius: {
    name: 'Verseau', dates: 'du 20 janvier au 18 février', elementMode: 'air fixe', ruler: 'Saturne dans la tradition et Uranus dans l’astrologie moderne',
    core: 'un regard indépendant, inventif et attentif aux systèmes',
    strength: 'voir les règles de l’extérieur, relier les personnes autour d’une idée et imaginer une autre façon de faire',
    shadow: 'rester dans le concept pour éviter la vulnérabilité d’une présence immédiate',
    love: 'de l’amitié, de la liberté mentale et une relation qui respecte ce qui le rend singulier',
    friendship: 'des communautés curieuses, atypiques et unies par des valeurs plutôt que par la conformité',
    work: 'innover, organiser des réseaux, questionner les habitudes et concevoir des solutions collectives',
    purpose: 'faire descendre les idées d’avenir dans des gestes humains et accessibles aujourd’hui',
    sun: 'une identité qui se construit par la différence, la vision et l’appartenance choisie', moon: 'des émotions qui demandent de l’espace et passent souvent d’abord par la pensée',
    rising: 'une présence originale, observatrice et difficile à classer', venus: 'un amour fondé sur l’amitié, la franchise et le respect de l’autonomie',
    mars: 'un désir tenace qui agit pour une idée et résiste à toute pression arbitraire', house: 'le domaine où tu innoves, contestes les normes et cherches plus de liberté',
    ease: 'Les Gémeaux, la Balance et le Sagittaire accompagnent souvent sa curiosité et son indépendance', tension: 'Le Taureau, le Scorpion et le Lion mettent à l’épreuve son entêtement et sa distance',
    care: 'retrouver le corps, nourrir quelques liens proches et transformer une idée en geste concret',
    privateTruth: 'Le Verseau n’est pas sans émotions ; il a souvent besoin de les comprendre avant de savoir comment les partager',
  },
  pisces: {
    name: 'Poissons', dates: 'du 19 février au 20 mars', elementMode: 'eau mutable', ruler: 'Jupiter dans la tradition et Neptune dans l’astrologie moderne',
    core: 'une sensibilité imaginative, compatissante et perméable aux non-dits',
    strength: 'adoucir les frontières, imaginer, créer et écouter ce qui n’a pas encore trouvé de langage',
    shadow: 'se dissoudre dans les besoins des autres ou appeler destin ce qui demande surtout des limites',
    love: 'de la tendresse, du mystère, de l’empathie et une relation où la sensibilité n’est pas tournée en ridicule',
    friendship: 'des liens doux, créatifs et profondément humains où personne ne doit feindre la dureté',
    work: 'créer, soigner, accompagner, interpréter les symboles et travailler entre plusieurs mondes',
    purpose: 'comprendre que la compassion avec des limites reste de la compassion, et dure souvent plus longtemps',
    sun: 'une identité nourrie par l’inspiration, le don de soi et l’imagination', moon: 'des émotions poreuses qui captent les atmosphères, les rêves et les silences',
    rising: 'une présence douce, changeante et difficile à définir', venus: 'un amour idéaliste, romantique et avide de beauté partagée',
    mars: 'un désir inspiré, indirect et plus efficace lorsqu’il trouve un sens émotionnel', house: 'le domaine où les frontières s’adoucissent et où apparaissent rêve, foi, art ou compassion',
    ease: 'Le Cancer, le Scorpion et le Capricorne comprennent souvent leur profondeur et leur donnent un cadre', tension: 'Les Gémeaux, le Sagittaire et la Vierge confrontent parole, vérité et ordre',
    care: 'dormir, retrouver l’eau et la musique, s’offrir une solitude douce et poser des limites aux demandes',
    privateTruth: 'Les Poissons ne sont pas perdus ; ils perçoivent souvent une couche du réel que les autres ignorent',
  },
};

function buildGuide(slug: string, p: Profile): FrenchGuide {
  const article = ({ virgo: 'la', libra: 'la', gemini: 'les', pisces: 'les' } as Record<string, string>)[slug] ?? 'le';
  const plural = article === 'les';
  const possessive = plural ? 'leur' : 'son';
  const subject = `${article} ${p.name}`;
  const subjectCap = `${article[0].toUpperCase()}${article.slice(1)} ${p.name}`;
  const deName = article === 'le' ? `du ${p.name}` : article === 'la' ? `de la ${p.name}` : `des ${p.name}`;
  const elementPhrase = /^[aeiouyàâäéèêëîïôöùûü]/iu.test(p.elementMode) ? `d’${p.elementMode}` : `de ${p.elementMode}`;
  const intro = [
    `${subjectCap} ${plural ? 'apportent' : 'apporte'} ${p.core}. Ce signe ${elementPhrase}, gouverné par ${p.ruler}, montre comment un élan particulier prend forme dans la vie quotidienne.`,
    `Dans un thème astral, ${subject} ${plural ? 'indiquent' : 'indique'} un domaine où tu peux ${p.strength}. Cette qualité devient plus juste lorsqu’elle reste un choix plutôt qu’un automatisme.`,
  ];
  const sections: FrenchGuide['sections'] = [
    {
      heading: `Personnalité ${deName}`,
      body: [
        `${subjectCap} ${plural ? 'se reconnaissent' : 'se reconnaît'} souvent à ${p.core}. Cela ne veut pas dire que toutes les personnes de ce signe se ressemblent, mais que ce rythme devient visible lorsque le thème lui donne de la place.`,
        `Sa grande force consiste à ${p.strength}. Son défi apparaît lorsque ce signe commence à ${p.shadow}. La maturité ne demande pas d’effacer le signe, mais d’en choisir la meilleure expression.`,
      ],
    },
    {
      heading: `${subjectCap} en amour`,
      body: [
        `En amour, ${subject} ${plural ? 'recherchent' : 'recherche'} ${p.love}. L’attirance ne suffit pas : le lien doit aussi respecter ${possessive} rythme et ${plural ? 'leur' : 'sa'} manière de faire confiance.`,
        `En amitié, ce signe apprécie ${p.friendship}. La compatibilité la plus saine n’est pas toujours la plus spectaculaire ; c’est souvent celle qui laisse chacun respirer sans avoir à se traduire toute la journée.`,
      ],
    },
    {
      heading: `${subjectCap} dans ton thème`,
      body: [`Tout le monde a ${subject} quelque part dans son thème. Cette maison montre ${p.house}. Les planètes qui s’y trouvent précisent la façon dont ce sujet s’exprime.`],
    },
    {
      heading: `Comment reconnaître ${subject}`,
      body: [
        `On remarque d’abord ${p.core}. Le signe peut être discret ou extraverti selon le reste du thème, mais son attention revient souvent au même besoin fondamental.`,
        `Son don est de ${p.strength}. Lorsqu’il n’a rien à prouver, cette qualité devient plus généreuse, plus précise et plus facile à recevoir.`,
        `Sa difficulté est de ${p.shadow}. Lire le signe comme un outil plutôt que comme une étiquette aide à distinguer une qualité vivante d’un vieux réflexe de protection.`,
      ],
    },
    {
      heading: `${subjectCap}, liens et confiance`,
      body: [
        `Pour se sentir proche, ${subject} ${plural ? 'recherchent' : 'recherche'} ${p.love}. Lorsque cela manque, une relation peut sembler correcte de l’extérieur tout en restant vide à l’intérieur.`,
        `${p.ease}. C’est souvent l’accord le plus fluide. ${p.tension}. Ces liens ne sont pas condamnés : ils demandent simplement plus de conscience et de dialogue.`,
        `Le signe solaire n’est qu’un début. La Lune, Vénus, Mars, l’ascendant, les maisons et les aspects racontent la relation réelle entre deux thèmes.`,
      ],
    },
    {
      heading: `${subjectCap}, travail et direction`,
      body: [
        `Dans le travail, ${subject} ${plural ? 'excellent' : 'excelle'} lorsque ce signe peut ${p.work}. Il ne s’agit pas forcément d’un métier précis, mais d’une façon d’aborder n’importe quelle tâche.`,
        `Sa direction profonde consiste à ${p.purpose}. Elle peut commencer par une décision très simple, répétée assez longtemps pour devenir une manière de vivre.`,
        `Les ressources sont utiles lorsqu’elles soutiennent la vie réelle. Une routine, un budget ou un objectif doit donner un cadre au signe, pas l’enfermer dans une caricature de lui-même.`,
      ],
    },
    {
      heading: `${subjectCap} dans les placements du thème`,
      risingProfile: true,
      body: [
        `Avec le Soleil en ${p.name}, on trouve ${p.sun}. Avec la Lune en ${p.name}, on rencontre ${p.moon}. Avec l’ascendant en ${p.name}, le monde perçoit d’abord ${p.rising}.`,
        `Vénus en ${p.name} évoque ${p.venus}. Mars en ${p.name} décrit ${p.mars}. Ces placements expliquent parfois pourquoi une personne ne se reconnaît pas dans la description habituelle de son signe solaire.`,
        `La maison occupée par ${subject} indique ${p.house}. Calcule ton thème complet avec l’heure et le lieu de naissance pour voir si ce sujet apparaît dans l’identité, les relations, le travail, la famille ou la vie intérieure.`,
        `Les dates ${deName} vont généralement ${p.dates}, mais le Soleil n’entre pas dans un signe à la même heure chaque année. Près d’une limite, seul un thème calculé avec tes données donne une réponse fiable.`,
      ],
    },
    {
      heading: `Ombre et évolution ${deName}`,
      body: [
        `L’ombre ${deName} n’est pas un défaut moral. C’est souvent une stratégie autrefois utile qui s’est mise à fonctionner toute seule : ${p.shadow}.`,
        `Son apprentissage consiste à ${p.purpose}. Le but n’est pas de nier l’impulsion du signe, mais de lui donner une forme plus consciente et plus durable.`,
        `Le corps compte aussi. ${subjectCap} ${plural ? 'gagnent' : 'gagne'} à ${p.care}. L’astrologie devient utile lorsqu’elle rejoint de petites décisions concrètes.`,
      ],
    },
    {
      heading: `Ce que ${subject} ${plural ? 'disent' : 'dit'} rarement à voix haute`,
      body: [
        `${p.privateTruth}. Cette vérité intime en dit souvent plus que les stéréotypes associés au signe.`,
        `${subjectCap} ${plural ? 'peuvent' : 'peut'} réunir des contraires : force et besoin de soin, liberté et appartenance, calme apparent et vie intérieure intense. Le thème complet laisse ces mélanges exister.`,
        `Ce guide est donc un point de départ. Pour comprendre ${subject} dans ta vie, regarde sa maison, les planètes présentes et les aspects formés. Le signe donne le vocabulaire ; le thème astral compose la phrase.`,
      ],
    },
  ];
  const faq: FrenchGuide['faq'] = [
    { q: `Quelles sont les dates ${deName} ?`, a: `En général ${p.dates}. ${EDGE_COPY}` },
    { q: `Quel est l’élément ${deName} ?`, a: `${subjectCap} ${plural ? 'sont' : 'est'} un signe ${elementPhrase}. Astre maître : ${p.ruler}.` },
    { q: `Quels signes sont compatibles avec ${subject} ?`, a: `${p.ease}. Pour une lecture vraiment utile, compare les deux thèmes complets.` },
    { q: `Que signifie une forte présence ${deName} dans le thème ?`, a: `Plusieurs planètes ou points importants parlent alors le langage de ce signe ${elementPhrase}. Les maisons et les aspects indiquent où et comment cette présence s’exprime.` },
    { q: `Et si je ne me reconnais pas dans ce portrait ${deName} ?`, a: 'C’est courant. L’ascendant, la Lune, les planètes dominantes et les aspects forts modifient beaucoup la façon dont le signe solaire se vit. Calcule le thème complet avant de l’écarter.' },
    { q: `Quel est l’apprentissage ${deName} ?`, a: `Il consiste à ${p.purpose}. Le signe conserve ainsi sa force sans rester prisonnier d’un réflexe de défense.` },
  ];
  return {
    sign: slug,
    title: `${p.name} : dates, personnalité, compatibilité et signification`,
    description: `Guide français ${deName} : dates, personnalité, amour, compatibilité et signification dans ton thème astral. ${EDGE_COPY}`,
    intro,
    sections,
    faq,
  };
}

export const FR_GUIDES: Record<string, FrenchGuide> = Object.fromEntries(
  Object.entries(PROFILES).map(([slug, profile]) => [slug, buildGuide(slug, profile)]),
);

export function frenchGuideFor(sign: Sign): FrenchGuide {
  const guide = FR_GUIDES[sign.slug];
  if (!guide) throw new Error(`Missing French guide for ${sign.slug}`);
  return guide;
}
