# Revue linguistique du français

Méthode : **AI language review by Sol**.

Date de la revue : **15 juillet 2026**.

Statut : **la revue linguistique intégrée est terminée pour les pages, les
guides, les dictionnaires et les modules interactifs en français. Le contrôle
visuel à 320 px, la couverture des polices et le gate Linux complet sont
validés**.

accepted by the owner in lieu of a human native-speaker sign-off.

La revue suit un français chaleureux et informel, avec `tu` partout. La
terminologie retenue est `thème astral`, `ascendant`, `maisons`, `transits`,
`pleine lune`, `nouvelle lune` et `rétrograde`.

## Résultats de la revue

- [x] Les 16 fichiers de pages présents sous `src/pages/fr/` correspondent au
  jeu de routes espagnol : accueil, outils, huit surfaces de calcul ou de
  lecture, profil, méthode, confidentialité, 404, guides et repli `noindex`.
- [x] Les douze guides ont chacun 2 introductions, 9 sections, 24 paragraphes,
  6 FAQ et exactement une section `risingProfile`, comparés dynamiquement à
  `spanishGuideFor(sign)`.
- [x] Les douze pratiques de progression sont distinctes et conservent les
  faits du corpus source espagnol.
- [x] Les calques et fautes clairs ont été corrigés, notamment les formulations
  sur les emplacements dans le thème, le JPL, la synchronisation, les
  notifications push et l’identifiant de quota.
- [x] Les espaces insécables françaises précèdent `:`, `;`, `?` et `!` dans le
  contenu destiné aux lecteurs.
- [x] Les scans de source ne trouvent ni registre formel `vous`, ni prose
  espagnole, ni prose anglaise non signalée. Les destinations encore en anglais
  sont explicitement indiquées et portent `hreflang="en"`.
- [x] Les dictionnaires partagés, les entrées `fr` des modules interactifs,
  l’assistant, les notifications, les libellés astrologiques, la navigation,
  le pied de page et le sitemap ont été relus après intégration.
- [x] Les clés et paramètres substitués des chaînes françaises correspondent
  aux chaînes anglaises, sans perte de variable ni changement de sens.
- [x] Les corrections de cette revue ne touchent aucune chaîne anglaise,
  espagnole ou portugaise, ni `public/`, l’aile du registre ou le SDK.
- [x] Les 16 routes représentatives ont été parcourues à 320 × 844 px : aucune
  largeur de document excédentaire, aucune superposition de framework et
  aucune erreur de page. Les glyphes `à â é è ê ç œ` proviennent bien des
  versions auto-hébergées d’Instrument Sans, EB Garamond et JetBrains Mono.
- [x] Le build, le check, la suite complète, `check-dist`, le contrôle des
  bundles, la régression visuelle et Lighthouse passent dans le gate Linux. En
  local sous macOS, 458 tests sur 459 passent ; seul l’instantané astronomique
  préexistant diffère aux dernières décimales, sans modification du corpus.

## Chaînes critiques intégrées

Ces traductions ont été vérifiées dans leurs propriétaires partagés après leur
intégration.

| Source anglaise | Français | Note de registre |
| --- | --- | --- |
| `Registry` | `Registre` | Terme documentaire, sans connotation commerciale. |
| `Overview` | `Vue d’ensemble` | Libellé de navigation neutre. |
| `Collector’s wing` | `Aile des collections` | Ton muséal et discret. |
| `{Sign} also exists as one of the Twelve — a canonical record in the registry.` | `{Signe} figure aussi parmi les Douze — une notice de référence dans le registre.` | Une `notice` désigne une fiche de catalogue ; la même phrase convient au guide et au calculateur de thème. |
| `View the record →` | `Voir la notice →` | Renvoie à une fiche, pas à une transaction. |
| `The short version: when you calculate a chart, the math runs in your browser and your birth date, time, and place are never sent to us. Accounts and the weekly email are optional, off by default, and easy to leave. We show no ads and use no cross-site tracking.` | `En bref : lorsque tu calcules un thème astral, le calcul se fait dans ton navigateur ; ta date, ton heure et ton lieu de naissance ne nous sont jamais envoyés. Créer un compte et recevoir l’e-mail hebdomadaire restent facultatifs ; ces options sont désactivées par défaut et tu peux facilement t’en passer. Nous n’affichons aucune publicité et n’utilisons aucun suivi intersite.` | Direct, rassurant et fidèle aux choix facultatifs. |
| `Send this page:` / `Email` | `Partage cette page :` / `E-mail` | Tutoiement chaleureux et usage français courant. |

## Points de style laissés à l’arbitrage

Ces formulations sont correctes. Les propositions ci-dessous sont des choix de
voix, donc aucune n’a été appliquée.

| Fichier | Formulation actuelle | Proposition | Motif |
| --- | --- | --- | --- |
| `src/pages/fr/index.astro` | `Explore les étoiles derrière ton histoire.` | `Explore les astres derrière ton histoire.` | `Astres` est plus exact en astrologie ; `étoiles` reste plus immédiat et chaleureux. |
| `src/pages/fr/tools/index.astro` | `Quand le tien arrive, précisément, et ce qu’il tend à demander.` | `Quand le tien aura lieu, précisément, et ce qu’il tend à demander.` | Le futur est un peu plus idiomatique ; le présent reste vif et compréhensible. |
| `src/pages/fr/profile/index.astro` | `Tes thèmes enregistrés.` | `Thèmes enregistrés.` | Le titre sans possessif est plus sobre ; le possessif conserve l’intimité du site. |
| `src/pages/fr/baby-zodiac/index.astro` | `Zodiaque du bébé` | `Signe astrologique du bébé` | La proposition est plus descriptive ; la version actuelle reste cohérente avec le nom de l’outil source. |
| `src/data/fr-guides.ts` | `une étrangeté partagée` | `une originalité partagée` | `Originalité` est plus doux ; `étrangeté` préserve mieux la nuance assumée du texte source. |

## Vérifications encore requises

Le routage, les liens `hreflang`, le sitemap, les formats de date, les noms des
signes, les islands, la navigation, le pied de page, l’assistant, les lentilles,
le parcours guidé, la recherche, les vues à 320 px, les polices auto-hébergées
et le gate Linux complet sont vérifiés.
