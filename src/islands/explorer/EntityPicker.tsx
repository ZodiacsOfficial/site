import { useId } from 'preact/hooks';
import { t, type CatalogLocale } from '../../lib/i18n';
import { aspectLabel, planetLabel } from '../../lib/i18n/astrology';
import { signName } from '../../lib/signs';
import { entityId, parseEntityId, type ChartSceneModel, type EntityRef } from '../../lib/scene/types';

interface EntityOption { ref: EntityRef; label: string }

/** The same chart entities as the wheel, exposed through a native control. */
export function entityPickerGroups(scene: ChartSceneModel, locale: CatalogLocale): {
  label: string;
  options: EntityOption[];
}[] {
  return [
    {
      label: t(locale, 'body'),
      // Naming the body alone does not turn an unknown-time reference
      // placement into a definite sign. The inspector explains uncertainty.
      options: scene.bodies.map((body): EntityOption => ({
        ref: { kind: 'body', body: body.body }, label: planetLabel(locale, body.body),
      })),
    },
    {
      label: t(locale, 'sign'),
      options: scene.signs.map((sign): EntityOption => ({
        ref: { kind: 'sign', sign: sign.slug }, label: signName(sign.slug, locale),
      })),
    },
    {
      label: t(locale, 'layerHouses'),
      options: (scene.houses ?? []).map((house): EntityOption => ({
        ref: { kind: 'house', house: house.index }, label: `${t(locale, 'house')} ${house.index}`,
      })),
    },
    {
      label: t(locale, 'explorerAngles'),
      options: scene.angles ? (['asc', 'mc', 'dsc', 'ic'] as const).map((angle): EntityOption => ({
        ref: { kind: 'angle', angle }, label: angle.toUpperCase(),
      })) : [],
    },
    {
      label: t(locale, 'aspectsFound'),
      options: scene.aspects.map((aspect): EntityOption => ({
        ref: { kind: 'aspect', a: aspect.a, b: aspect.b, type: aspect.type },
        label: `${planetLabel(locale, aspect.a)} ${aspectLabel(locale, aspect.type)} ${planetLabel(locale, aspect.b)}`,
      })),
    },
  ].filter((group) => group.options.length > 0);
}

interface Props {
  scene: ChartSceneModel;
  selection: EntityRef | null;
  locale: CatalogLocale;
  onSelect: (selection: EntityRef | null) => void;
}

export default function EntityPicker({ scene, selection, locale, onSelect }: Props) {
  const id = useId();
  const groups = entityPickerGroups(scene, locale);
  return (
    <div class="field xplr-entity-picker">
      <label class="field__label" for={id}>{t(locale, 'explorerSelectPart')}</label>
      <select
        id={id}
        class="field__input"
        data-explorer-entity-picker
        value={selection ? entityId(selection) : ''}
        onChange={(event) => onSelect(parseEntityId((event.currentTarget as HTMLSelectElement).value))}
      >
        <option value="">{t(locale, 'explorerNoSelection')}</option>
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((option) => (
              <option key={entityId(option.ref)} value={entityId(option.ref)}>{option.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
