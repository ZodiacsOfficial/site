import { describe, expect, it } from 'vitest';
import { SIGNS } from '../lib/signs';
import { spanishGuideFor } from './es-guides';
import { italianGuideFor } from './it-guides';

describe('Italian sign guides', () => {
  it('keeps the full Italian guide structure complete across all twelve signs', () => {
    const names = ['Ariete', 'Toro', 'Gemelli', 'Cancro', 'Leone', 'Vergine', 'Bilancia', 'Scorpione', 'Sagittario', 'Capricorno', 'Acquario', 'Pesci'];
    const sourceParityAnchors: Record<string, string[]> = {
      aries: ['apre la ruota zodiacale', 'non trattare ogni ritardo come una sconfitta'],
      taurus: ['quando la primavera smette di promettere', 'distinguere la lealtà dall’abitudine'],
      gemini: ['aria in movimento', 'non usare l’ingegno per eludere la vulnerabilità'],
      cancer: ['solstizio di giugno', 'la Luna è nel proprio domicilio'],
      leo: ['cuore dell’estate', 'il Sole è nel proprio domicilio'],
      virgo: ['arriva con il raccolto', 'non trasformare ogni errore in un’identità'],
      libra: ['equinozio di settembre', 'non chiamare armonia il proprio silenzio'],
      scorpio: ['quando l’anno entra in profondità', 'chiedere verità senza punire la vulnerabilità'],
      sagittarius: ['guarda verso l’orizzonte', 'non trasformare ogni limite in una prigione'],
      capricorn: ['solstizio di dicembre', 'non rimandare la gioia alla fine della salita'],
      aquarius: ['guarda il sistema dall’esterno', 'non soltanto di una teoria brillante'],
      pisces: ['chiudono la ruota zodiacale', 'non salvare chi non vuole cambiare'],
    };
    expect(SIGNS.map((sign) => italianGuideFor(sign).title.split(':')[0])).toEqual(names);

    for (const sign of SIGNS) {
      const guide = italianGuideFor(sign);
      const source = spanishGuideFor(sign);
      const text = [
        ...guide.intro,
        ...guide.sections.flatMap((section) => [section.heading, ...section.body]),
        ...guide.faq.flatMap(({ q, a }) => [q, a]),
      ].join('\n');

      expect(guide.intro).toHaveLength(source.intro.length);
      expect(guide.sections).toHaveLength(source.sections.length);
      expect(guide.sections.flatMap((section) => section.body)).toHaveLength(source.sections.flatMap((section) => section.body).length);
      expect(guide.faq).toHaveLength(source.faq.length);
      expect(guide.sections.filter((section) => section.risingProfile)).toHaveLength(1);
      expect(guide.sections[6]?.heading).toContain('nelle posizioni del tema');
      expect(text).toContain('In coppia, il tema completo conta molto più del Sole');
      for (const anchor of sourceParityAnchors[sign.slug] ?? []) expect(text).toContain(anchor);
      expect(text).toMatch(/un segno (?:di |d’)/u);
      expect(text).not.toMatch(/[¿¡]|\b(?:carta|signo|compatibilidad|preguntas|nacimiento)\b/iu);
      expect(text).not.toMatch(/\b(?:birth chart|sun sign|rising sign|read more)\b/iu);
      expect(text).not.toMatch(/\b(?:thème|signe|personnalité|français|questions|naissance)\b/iu);
      expect(text).not.toMatch(/\b(?:Marzo|melodia|Vuoto|Scala|classifica|grafico|link)\b/u);
      expect(text).not.toContain('Astro governatore');
      expect(text).not.toContain('momenti senza prestazioni');
      expect(text).not.toContain('rimanere all’interno del concetto');
      expect(text).not.toContain('si confrontano con dettaglio');
    }
  });

  it('keeps the reviewed Italian corrections and rejects the replaced calques', () => {
    const aries = italianGuideFor(SIGNS.find(({ slug }) => slug === 'aries')!);
    const libra = italianGuideFor(SIGNS.find(({ slug }) => slug === 'libra')!);
    const capricorn = italianGuideFor(SIGNS.find(({ slug }) => slug === 'capricorn')!);
    const corpus = SIGNS.map((sign) => JSON.stringify(italianGuideFor(sign))).join('\n');

    expect(corpus).toContain('desiderio e conflitto allo stato puro: azione visibile, competizione aperta e poca pazienza per i giri di parole');
    expect(corpus).toContain('l’ambito in cui hai bisogno di autonomia, decisione e del permesso di provare prima di avere garanzie');
    expect(corpus).toContain('amicizie affidabili, buon cibo, musica, ricordi e una presenza senza fretta');
    expect(corpus).toContain('amicizie con cui viaggiare');
    expect(corpus).toContain('limiti personali di fronte alle persone esigenti');
    expect(libra.sections.flatMap(({ body }) => body).join('\n')).toContain('imparare che la vera pace a volte comincia con una frase scomoda detta al momento giusto');
    expect(capricorn.sections.flatMap(({ body }) => body).join('\n')).toContain('prendersi cura delle ossa, dormire, porre limiti al lavoro, coltivare l’umorismo, programmare il riposo e concedersi di non produrre');
    expect(aries.faq).toContainEqual({
      q: 'Con chi è compatibile l’Ariete?',
      a: 'Tende a trovarsi bene con Leone, Sagittario e Gemelli. Per una lettura di coppia davvero utile, confronta i due temi completi.',
    });
    expect(corpus).not.toMatch(/progetti spontanei|progetti ricchi di buon cibo|relazioni riposanti|legami viaggiatori|limiti energetici/u);
    expect(corpus).not.toContain('Quale pianeta governa l’Ariete?');
  });
});
