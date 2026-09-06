import { h } from 'preact';
import { render } from 'preact-render-to-string';
import { describe, expect, it } from 'vitest';
import { computeChart } from '../../lib/engine/full';
import { CORE_ROUTE_LOCALES, t } from '../../lib/i18n';
import { planetLabel } from '../../lib/i18n/astrology';
import { buildSceneModel } from '../../lib/scene/build';
import { entityId } from '../../lib/scene/types';
import EntityPicker, { entityPickerGroups } from './EntityPicker';

const sceneFor = (timeKnown: boolean) => buildSceneModel(computeChart({
  utc: new Date('1907-07-06T15:06:36.000Z'), latitude: 19.35, longitude: -99.16,
  houseSystem: 'whole', timeKnown, flags: [],
}));
const scene = sceneFor(true);

describe('native chart entity selection', () => {
  it.each(CORE_ROUTE_LOCALES)('exposes every chart entity through semantic options in %s', (locale) => {
    const groups = entityPickerGroups(scene, locale);
    const options = groups.flatMap((group) => group.options);
    const ids = options.map((option) => entityId(option.ref));
    const expected = [
      ...scene.bodies.map((body) => `body:${body.body}`),
      ...scene.signs.map((sign) => `sign:${sign.slug}`),
      ...Array.from({ length: 12 }, (_, index) => `house:${index + 1}`),
      'angle:asc', 'angle:mc', 'angle:dsc', 'angle:ic',
      ...scene.aspects.map((aspect) => entityId({ kind: 'aspect', ...aspect })),
    ];
    expect(ids).toEqual(expected);
    expect(new Set(ids).size).toBe(ids.length);
    for (const house of scene.houses!.filter((entry) => entry.occupants.length === 0)) {
      expect(ids).toContain(`house:${house.index}`);
    }
    expect(groups.every((group) => group.label.length > 0)).toBe(true);
    expect(options.find((option) => entityId(option.ref) === 'body:Moon')?.label).toBe(planetLabel(locale, 'Moon'));

    const markup = render(h(EntityPicker, { scene, locale, selection: null, onSelect: () => {} }));
    const labelId = markup.match(/<label[^>]* for="([^"]+)"/)?.[1];
    expect(labelId).toBeTruthy();
    expect(markup).toContain(`<select id="${labelId}"`);
    expect(markup).toContain(t(locale, 'explorerSelectPart'));
    expect(markup.match(/<option /g)).toHaveLength(expected.length + 1);
    expect(markup).not.toContain('tabindex="-1"');
  });

  it.each(CORE_ROUTE_LOCALES)('omits unavailable houses and angles on an unknown-time chart in %s', (locale) => {
    const groups = entityPickerGroups(sceneFor(false), locale);
    const options = groups.flatMap((group) => group.options);
    expect(options.filter((option) => option.ref.kind === 'house' || option.ref.kind === 'angle')).toEqual([]);
    expect(options.filter((option) => option.ref.kind === 'sign')).toHaveLength(12);
    expect(options.find((option) => entityId(option.ref) === 'body:Moon')?.label).toBe(planetLabel(locale, 'Moon'));
  });

  it('reflects a selection from another chart control in the native select', () => {
    const markup = render(h(EntityPicker, {
      scene, locale: 'en', selection: { kind: 'house', house: 12 }, onSelect: () => {},
    }));
    const selected = markup.match(/<option\b[^>]*\bselected[^>]*>/g);
    expect(selected).toHaveLength(1);
    expect(selected?.[0]).toContain('value="house:12"');
  });
});
