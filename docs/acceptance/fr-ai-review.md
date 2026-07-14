# Revue linguistique du français

Méthode : **AI language review by Sol**.

Date de la revue : **15 juillet 2026**.

Statut : **le corpus français isolé est revu ; son intégration aux rails de
locale, les modules interactifs et le contrôle visuel à 320 px restent à
effectuer sur la branche empilée**.

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
- [x] Aucune modification ne touche `public/`, une surface partagée, l’aile du
  registre ou le SDK dans ce brouillon de contenu isolé.
- [ ] Les dictionnaires partagés, les modules interactifs, l’assistant, les
  libellés astrologiques et le sitemap seront vérifiés après intégration aux
  branches L0 et portugaise.
- [ ] Le parcours visuel à 320 px et la couverture des glyphes
  `à â é è ê ç œ` par les trois polices auto-hébergées ne sont pas revendiqués
  par ce brouillon isolé.
- [ ] Le build, le check, la suite complète, `check-dist` et le contrôle des
  bundles seront consignés sur la branche intégrée.

## Chaînes critiques proposées pour l’intégration

Ces traductions sont les valeurs approuvées par la revue de contenu. Elles ne
sont pas câblées ici, car leurs propriétaires sont des fichiers partagés qui ne
font pas partie de ce brouillon localisé.

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

## Vérifications d’intégration encore requises

La branche de contenu a été produite depuis un instantané qui ne connaît que
`en` et `es`. Elle ne modifie volontairement ni les types de locale ni les
dictionnaires partagés. L’intégration doit encore relier `fr` au routage, aux
liens `hreflang`, au sitemap, aux formats de date, aux noms des signes, aux
islands, à la navigation, au pied de page, à l’assistant, aux lentilles, au
parcours guidé et à la recherche avant publication.
