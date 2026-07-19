import { useEffect, useId, useRef, useState } from 'preact/hooks';
import type { RefObject } from 'preact';
import { AURA_SIGN_KEYWORDS } from '../../lib/aura/source-alignment';
import {
  AURA_SIGN_ORDER,
  type AuraCabinetFinish,
  type AuraCabinetHolding,
  type AuraCabinetRevealMode,
  type AuraSign,
} from '../../lib/aura/types';
import { signBySlug } from '../../lib/signs';
import { ZodiacMedallion } from './ZodiacMedallion';
import { earnedCuratorialSets } from './curatorialSets';

export type AuraCabinetRevealOutcome = 'played' | 'reduced' | 'skipped';
export type AuraCabinetRevealStage =
  | 'waiting'
  | 'light'
  | 'pastel'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'strike'
  | 'settled';

export interface AuraCollectionCabinetProps {
  /** Material edition verified for each represented Registry sign. */
  holdings: readonly AuraCabinetHolding[];
  /** Fresh accessions animate once; restored and static cabinets render settled. */
  revealMode?: AuraCabinetRevealMode;
  /** Optional controlled selection. The principal work is used by default. */
  selectedSign?: AuraSign;
  /** Called after a visitor selects a cabinet niche. */
  onSelect?: (sign: AuraSign) => void;
  /** Receives one non-sensitive result for this cabinet reveal lifecycle. */
  onRevealOutcome?: (outcome: AuraCabinetRevealOutcome) => void;
  /** True for the built-in sample rather than a checked public collection. */
  illustrative?: boolean;
  /** Overrides the header kicker, for stage headers owned by the page. */
  kicker?: string;
  /** One factual provenance line for the placard, composed by the caller. */
  recordedNote?: string | null;
  /** Preformatted date for the Complete Twelve case plate. */
  plateDate?: string | null;
  /** Focus target after a fresh accession lands the cabinet on stage. */
  headingRef?: RefObject<HTMLHeadingElement>;
}

interface FinishMeta {
  numeral: 'I' | 'II' | 'III' | 'IV';
  name: string;
  /** Single-word caption for the niche status line; the placard carries the full name. */
  short: string;
  range: string;
  material: string;
}

const FINISH_ORDER: readonly AuraCabinetFinish[] = [
  'pastel',
  'bronze',
  'silver',
  'gold',
];

const FINISH_RANK: Record<AuraCabinetFinish, number> = {
  pastel: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
};

export const FINISH_META: Record<AuraCabinetFinish, FinishMeta> = {
  pastel: {
    numeral: 'I',
    name: 'Pastel Disc',
    short: 'Pastel',
    range: 'Under 10,000 held',
    material: 'The sign’s medallion, in its own pastel.',
  },
  bronze: {
    numeral: 'II',
    name: 'Bronze Edition',
    short: 'Bronze',
    range: 'From 10,000 held',
    material: 'The same pastel medallion, set in a cast bronze rim and sealed II.',
  },
  silver: {
    numeral: 'III',
    name: 'Silver Edition',
    short: 'Silver',
    range: 'From 100,000 held',
    material: 'The same pastel medallion, set in a cast silver rim and sealed III.',
  },
  gold: {
    numeral: 'IV',
    name: 'Gold Sculpture',
    short: 'Gold',
    range: 'From 1,000,000 held',
    material: 'The sign itself, cast in gold — the only edition that becomes a sculpture.',
  },
};

const ASSET_TIMEOUT_MS = 1_200;

/** Reveal beats, in milliseconds from the moment the case becomes visible. */
const REVEAL_BEATS: readonly [AuraCabinetRevealStage, number][] = [
  ['pastel', 300],
  ['bronze', 1_150],
  ['silver', 1_900],
  ['gold', 2_650],
  ['strike', 3_500],
];
const REVEAL_SETTLE_MS = 4_100;

function catalogueNumber(index: number): string {
  return String(index + 1).padStart(2, '0');
}

function revealRank(stage: AuraCabinetRevealStage): number {
  if (stage === 'bronze') return FINISH_RANK.bronze;
  if (stage === 'silver') return FINISH_RANK.silver;
  if (stage === 'gold' || stage === 'strike' || stage === 'settled') {
    return FINISH_RANK.gold;
  }
  return FINISH_RANK.pastel;
}

/** The visible material never advances beyond the edition the holding earned. */
export function cabinetVisibleFinish(
  finish: AuraCabinetFinish,
  stage: AuraCabinetRevealStage,
): AuraCabinetFinish {
  if (stage === 'settled') return finish;
  const visibleRank = Math.min(FINISH_RANK[finish], revealRank(stage));
  return FINISH_ORDER[visibleRank];
}

function materialAsset(sign: AuraSign): string {
  return `/assets/cabinet-materials/gold/${sign}`;
}

export function normalizedGoldCount(value?: string): bigint {
  if (!value || value.length > 78 || !/^\d+$/.test(value)) return 1n;
  const count = BigInt(value);
  return count > 0n ? count : 1n;
}

export function exactGoldCount(value?: string): string {
  return normalizedGoldCount(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * One public count grammar for badges, seal nodes, and the exhibit card:
 * exact through nine sculptures, then a dignified cap. The placard alone
 * carries the exact figure, as the catalogue record.
 */
export function compactGoldCount(value?: string): string {
  const count = normalizedGoldCount(value);
  return count > 9n ? '9+' : count.toString();
}

/** The case's principal work: highest edition, then Gold count, then zodiac order. */
export function principalSign(
  holdings: readonly AuraCabinetHolding[],
): AuraSign | null {
  const holdingBySign = new Map(holdings.map((holding) => [holding.sign, holding]));
  let principal: AuraSign | null = null;
  let principalRank = -1;
  let principalGold = -1n;
  for (const sign of AURA_SIGN_ORDER) {
    const holding = holdingBySign.get(sign);
    if (!holding) continue;
    const rank = FINISH_RANK[holding.finish];
    const gold = holding.finish === 'gold' ? normalizedGoldCount(holding.goldCount) : 0n;
    if (rank > principalRank || (rank === principalRank && gold > principalGold)) {
      principal = sign;
      principalRank = rank;
      principalGold = gold;
    }
  }
  return principal;
}

function sculpturesLine(goldCount: bigint): string {
  if (goldCount === 1n) {
    return 'One gold sculpture — one for each complete million held.';
  }
  return `${exactGoldCount(goldCount.toString())} gold sculptures — one for each complete million held.`;
}

function decodeImage(image: HTMLImageElement): Promise<boolean> {
  const decodeLoadedImage = () => {
    if (image.naturalWidth === 0) return Promise.resolve(false);
    if (typeof image.decode !== 'function') return Promise.resolve(true);
    return image.decode().then(() => true, () => true);
  };
  if (image.complete) return decodeLoadedImage();

  return new Promise((resolve) => {
    image.addEventListener('load', () => void decodeLoadedImage().then(resolve), { once: true });
    image.addEventListener('error', () => resolve(false), { once: true });
  });
}

function prepareMaterialAssets(cabinet: HTMLElement): Promise<boolean> {
  const images = Array.from(cabinet.querySelectorAll<HTMLImageElement>(
    '.aura-collection-cabinet__material--gold img',
  ));

  if (images.length === 0) return Promise.resolve(true);

  return new Promise((resolve) => {
    let complete = false;
    const settle = (ready: boolean) => {
      if (complete) return;
      complete = true;
      window.clearTimeout(timeout);
      resolve(ready);
    };
    const timeout = window.setTimeout(() => settle(false), ASSET_TIMEOUT_MS);
    void Promise.all(images.map(decodeImage)).then((results) => settle(results.every(Boolean)));
  });
}

function MaterialArtwork({
  sign,
  finish,
  current,
  eager,
}: {
  sign: AuraSign;
  finish: AuraCabinetFinish;
  current: boolean;
  eager: boolean;
}) {
  const classes = [
    'aura-collection-cabinet__material',
    `aura-collection-cabinet__material--${finish}`,
    current ? 'is-current' : '',
  ].filter(Boolean).join(' ');

  if (finish === 'pastel') {
    return (
      <span class={classes} data-aura-cabinet-material={finish}>
        <ZodiacMedallion
          sign={sign}
          size={72}
          className="aura-collection-cabinet__medallion"
          loading={eager ? 'eager' : 'lazy'}
        />
      </span>
    );
  }

  if (finish === 'bronze' || finish === 'silver') {
    return (
      <span class={classes} data-aura-cabinet-material={finish}>
        <span class="aura-collection-cabinet__edition-disc">
          <span
            class="aura-collection-cabinet__edition-seal"
            data-aura-cabinet-edition-seal={finish}
          >
            {FINISH_META[finish].numeral}
          </span>
        </span>
      </span>
    );
  }

  const asset = materialAsset(sign);
  return (
    <picture class={classes} data-aura-cabinet-material={finish}>
      <source srcset={`${asset}.avif`} type="image/avif" />
      <img
        src={`${asset}.webp`}
        width="256"
        height="256"
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
      />
    </picture>
  );
}

/**
 * A fixed museum cabinet for the twelve Registry signs.
 *
 * Material changes explain an already-verified holding. The component never
 * exposes balances, calculates tiers, or prompts a visitor to acquire tokens.
 */
export function AuraCollectionCabinet({
  holdings,
  revealMode = 'settled',
  selectedSign,
  onSelect,
  onRevealOutcome,
  illustrative = false,
  kicker,
  recordedNote = null,
  plateDate = null,
  headingRef,
}: AuraCollectionCabinetProps) {
  const cabinetRef = useRef<HTMLElement>(null);
  const outcomeRef = useRef(onRevealOutcome);
  const holdingBySign = new Map(holdings.map((holding) => [holding.sign, holding]));
  const representedSigns = AURA_SIGN_ORDER.filter((sign) => holdingBySign.has(sign));
  const holdingsFingerprint = AURA_SIGN_ORDER
    .flatMap((sign) => {
      const holding = holdingBySign.get(sign);
      return holding ? [`${sign}:${holding.finish}:${holding.goldCount ?? ''}`] : [];
    })
    .join('|');
  const initialSign = principalSign(holdings) ?? AURA_SIGN_ORDER[0];
  const [internalSelectedSign, setInternalSelectedSign] = useState<AuraSign>(initialSign);
  const [revealStage, setRevealStage] = useState<AuraCabinetRevealStage>(
    revealMode === 'animate' ? 'waiting' : 'settled',
  );
  const [announceFinal, setAnnounceFinal] = useState(false);
  const activeSign = selectedSign ?? internalSelectedSign;
  const activeIndex = AURA_SIGN_ORDER.indexOf(activeSign);
  const active = signBySlug(activeSign);
  const activeHolding = holdingBySign.get(activeSign);
  const placardId = useId();
  const isComplete = representedSigns.length === AURA_SIGN_ORDER.length;
  const curatorialSets = earnedCuratorialSets(representedSigns);
  const plaqueSets = curatorialSets.filter((set) => set.kind !== 'complete-twelve');

  useEffect(() => {
    outcomeRef.current = onRevealOutcome;
  }, [onRevealOutcome]);

  useEffect(() => {
    let cancelled = false;
    let revealing = false;
    let reported = false;
    const timers: number[] = [];
    const cabinet = cabinetRef.current;

    const report = (outcome: AuraCabinetRevealOutcome) => {
      if (reported) return;
      reported = true;
      outcomeRef.current?.(outcome);
    };
    const settle = (outcome: AuraCabinetRevealOutcome) => {
      if (cancelled) return;
      revealing = false;
      timers.forEach((timer) => window.clearTimeout(timer));
      setRevealStage('settled');
      setAnnounceFinal(revealMode === 'animate');
      report(outcome);
    };

    setAnnounceFinal(false);
    if (revealMode !== 'animate' || holdings.length === 0) {
      setRevealStage('settled');
      report('skipped');
      return;
    }

    setRevealStage('waiting');
    const reduced = typeof matchMedia === 'function'
      && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      settle('reduced');
      return;
    }
    if (!cabinet || typeof IntersectionObserver !== 'function') {
      settle('skipped');
      return;
    }

    let visible = false;
    let assetsReady = false;
    let revealStartedAt = 0;
    let sequenceScheduled = false;
    const scheduleStage = (stage: AuraCabinetRevealStage, at: number) => {
      const remaining = Math.max(0, at - (Date.now() - revealStartedAt));
      if (remaining === 0) {
        setRevealStage(stage);
        return;
      }
      timers.push(window.setTimeout(() => setRevealStage(stage), remaining));
    };
    const scheduleSequence = () => {
      if (cancelled || sequenceScheduled || !visible || !assetsReady) return;
      sequenceScheduled = true;
      for (const [stage, at] of REVEAL_BEATS) scheduleStage(stage, at);
      const remaining = Math.max(0, REVEAL_SETTLE_MS - (Date.now() - revealStartedAt));
      if (remaining === 0) settle('played');
      else timers.push(window.setTimeout(() => settle('played'), remaining));
    };

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      visible = true;
      revealing = true;
      revealStartedAt = Date.now();
      setRevealStage('light');
      scheduleSequence();
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    observer.observe(cabinet);

    void prepareMaterialAssets(cabinet).then((ready) => {
      if (cancelled) return;
      if (!ready) {
        observer.disconnect();
        settle('skipped');
        return;
      }
      assetsReady = true;
      scheduleSequence();
    });

    const handleVisibility = () => {
      if (document.hidden && revealing) {
        observer.disconnect();
        settle('skipped');
      }
    };
    // A visitor's click or keypress mid-reveal means "show me the case now".
    const handleInterrupt = () => {
      if (!revealing) return;
      observer.disconnect();
      settle('skipped');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    cabinet.addEventListener('pointerdown', handleInterrupt);
    cabinet.addEventListener('keydown', handleInterrupt);

    return () => {
      cancelled = true;
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
      document.removeEventListener('visibilitychange', handleVisibility);
      cabinet.removeEventListener('pointerdown', handleInterrupt);
      cabinet.removeEventListener('keydown', handleInterrupt);
      if (!reported) report('skipped');
    };
  }, [holdingsFingerprint, revealMode]);

  function select(sign: AuraSign): void {
    if (selectedSign === undefined) setInternalSelectedSign(sign);
    onSelect?.(sign);
  }

  const activeVisibleFinish = activeHolding
    ? cabinetVisibleFinish(activeHolding.finish, revealStage)
    : null;
  const activeGoldCount = activeHolding?.finish === 'gold'
    ? normalizedGoldCount(activeHolding.goldCount)
    : null;

  return (
    <section
      ref={cabinetRef}
      class={`aura-collection-cabinet${isComplete ? ' is-complete' : ''}`}
      aria-labelledby={`${placardId}-title`}
      data-aura-cabinet-complete={isComplete ? 'true' : 'false'}
      data-aura-cabinet-count={representedSigns.length}
      data-aura-cabinet-stage={revealStage}
    >
      <header class="aura-collection-cabinet__header">
        <div>
          <p class="aura-collection-cabinet__kicker">
            {kicker ?? (illustrative ? 'Curator’s sample' : 'Collection display')}
          </p>
          <h2 id={`${placardId}-title`} ref={headingRef} tabIndex={-1}>
            The Cabinet of Twelve
          </h2>
        </div>
        <p class="aura-collection-cabinet__count" aria-live="polite">
          <strong>{representedSigns.length}</strong> of the Twelve{' '}
          {illustrative ? 'in this sample' : 'in this collection'}.
        </p>
      </header>

      <div class="aura-collection-cabinet__body">
        <div class="aura-collection-cabinet__frame">
          <ol
            class="aura-collection-cabinet__grid"
            aria-label="The twelve Registry signs in zodiac order"
          >
            {AURA_SIGN_ORDER.map((sign, index) => {
              const record = signBySlug(sign);
              const holding = holdingBySign.get(sign);
              const represented = Boolean(holding);
              const selected = sign === activeSign;
              const finish = holding?.finish;
              const visibleFinish = finish ? cabinetVisibleFinish(finish, revealStage) : null;
              const goldCount = finish === 'gold'
                ? normalizedGoldCount(holding?.goldCount)
                : null;
              const hasGoldMultiplicity = goldCount !== null && goldCount > 1n;
              const extraStrikes = goldCount === null
                ? 0
                : Number(goldCount - 1n > 3n ? 3n : goldCount - 1n);
              const strikesOverflow = goldCount !== null && goldCount > 4n;
              const status = represented
                ? `represented as ${FINISH_META[finish!].name}${goldCount ? `, ${exactGoldCount(goldCount.toString())} gold ${goldCount === 1n ? 'sculpture' : 'sculptures'}` : ''}`
                : 'place reserved — no holding found';

              return (
                <li
                  class="aura-collection-cabinet__item"
                  key={sign}
                  data-aura-cabinet-sign={sign}
                  data-aura-cabinet-represented={represented ? 'true' : 'false'}
                  data-aura-cabinet-finish={finish}
                  style={{ '--aura-cabinet-index': String(index) }}
                >
                  <button
                    class={`aura-collection-cabinet__niche${represented ? ' is-represented' : ' is-recessed'}${selected ? ' is-selected' : ''}${hasGoldMultiplicity ? ' has-gold-multiplicity' : ''}`}
                    type="button"
                    aria-pressed={selected}
                    aria-controls={placardId}
                    aria-label={`${record.name}, ${status}. Show catalogue placard.`}
                    onClick={() => select(sign)}
                  >
                    <span class="aura-collection-cabinet__number" aria-hidden="true">
                      Nº {catalogueNumber(index)}
                    </span>

                    <span class="aura-collection-cabinet__object" aria-hidden="true">
                      {holding ? (
                        <>
                          {FINISH_ORDER
                            .filter((material) => FINISH_RANK[material] <= FINISH_RANK[holding.finish])
                            .map((material) => (
                              <MaterialArtwork
                                key={material}
                                sign={sign}
                                finish={material}
                                current={material === 'pastel'
                                  ? visibleFinish !== 'gold'
                                  : material === visibleFinish}
                                eager={revealMode === 'animate' || index < 6}
                              />
                            ))}
                          {hasGoldMultiplicity && (
                            <span class="aura-collection-cabinet__strikes">
                              {Array.from({ length: extraStrikes }, (_, strikeIndex) => (
                                <span
                                  key={`${sign}-strike-${strikeIndex}`}
                                  class="aura-collection-cabinet__strike-roundel"
                                  style={{ '--aura-strike-index': String(strikeIndex) }}
                                >
                                  {`${record.glyph}︎`}
                                </span>
                              ))}
                              {strikesOverflow && (
                                <span
                                  class="aura-collection-cabinet__strike-roundel aura-collection-cabinet__strike-roundel--more"
                                  style={{ '--aura-strike-index': String(extraStrikes) }}
                                >
                                  +
                                </span>
                              )}
                            </span>
                          )}
                        </>
                      ) : (
                        <span class="aura-collection-cabinet__reserved-mark">
                          {`${record.glyph}︎`}
                        </span>
                      )}
                    </span>

                    {hasGoldMultiplicity && (
                      <span class="aura-collection-cabinet__multiplicity-badge" aria-hidden="true">
                        ×{compactGoldCount(goldCount!.toString())}
                      </span>
                    )}

                    <span class="aura-collection-cabinet__name">{record.name}</span>
                    {finish && (
                      <span class="aura-collection-cabinet__status" aria-hidden="true">
                        {`${FINISH_META[visibleFinish!].numeral} · ${FINISH_META[visibleFinish!].short}${visibleFinish === 'gold' && hasGoldMultiplicity ? ` ×${compactGoldCount(goldCount.toString())}` : ''}`}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>

          {isComplete && (
            <p class="aura-collection-cabinet__case-plate" data-aura-cabinet-case-plate>
              <span>The Complete Twelve</span>
              {plateDate && <span class="aura-collection-cabinet__case-plate-date">recorded {plateDate}</span>}
            </p>
          )}
        </div>

        <article
          class="aura-collection-cabinet__placard"
          id={placardId}
          aria-live="polite"
          aria-atomic="true"
          data-aura-cabinet-placard={activeSign}
        >
          <div class="aura-collection-cabinet__placard-index">
            <span>Catalogue</span>
            <strong>Nº {catalogueNumber(activeIndex)} / XII</strong>
            <small>
              {activeHolding
                ? `${FINISH_META[activeHolding.finish].name}${activeGoldCount ? ` · ×${exactGoldCount(activeGoldCount.toString())}` : ''}`
                : 'Place reserved'}
            </small>
          </div>

          <div class="aura-collection-cabinet__placard-copy">
            <h3>{active.name}</h3>
            <ul aria-label={`${active.name} catalogue keywords`}>
              {AURA_SIGN_KEYWORDS[activeSign].map((keyword) => (
                <li key={keyword}>{keyword}</li>
              ))}
            </ul>
            <div
              class="aura-collection-cabinet__lineage"
              aria-label={activeHolding
                ? `${active.name} edition: ${FINISH_META[activeHolding.finish].name}${activeGoldCount ? `, ${exactGoldCount(activeGoldCount.toString())} gold ${activeGoldCount === 1n ? 'sculpture' : 'sculptures'}` : ''}`
                : `${active.name} is not represented`}
            >
              {FINISH_ORDER.map((finish) => (
                <span
                  key={finish}
                  aria-hidden="true"
                  class={finish === activeVisibleFinish ? 'is-current' : undefined}
                  data-aura-cabinet-lineage={finish}
                >
                  {FINISH_META[finish].numeral}
                </span>
              ))}
            </div>
            {activeHolding ? (
              <>
                <p class="aura-collection-cabinet__edition">
                  <strong>{FINISH_META[activeHolding.finish].name}</strong>
                  <span>{FINISH_META[activeHolding.finish].range}</span>
                </p>
                <p class="aura-collection-cabinet__material-note">
                  {FINISH_META[activeHolding.finish].material}
                  {activeGoldCount ? ` ${sculpturesLine(activeGoldCount)}` : ''}
                </p>
              </>
            ) : (
              <p class="aura-collection-cabinet__material-note">
                {illustrative
                  ? `${active.name}’s place is reserved in this sample.`
                  : `${active.name}’s place is reserved. No Registry holding was found at this address.`}
              </p>
            )}
            {recordedNote && (
              <p class="aura-collection-cabinet__provenance">{recordedNote}</p>
            )}
            <a href={`/registry/${activeSign}/`}>
              View Registry record <span aria-hidden="true">→</span>
            </a>
          </div>
        </article>
      </div>

      {plaqueSets.length > 0 && (
        <section
          class="aura-collection-cabinet__plaques"
          aria-labelledby={`${placardId}-sets-title`}
        >
          <p class="aura-collection-cabinet__kicker" id={`${placardId}-sets-title`}>
            Completed arrangements
          </p>
          <ul>
            {plaqueSets.map((set) => (
              <li
                key={set.id}
                data-aura-curatorial-set={set.id}
                data-aura-curatorial-kind={set.kind}
              >
                <span>{set.label}</span>
                <strong>{set.title}</strong>
                <small>
                  {set.members.map((sign) => signBySlug(sign).name).join(' · ')}
                </small>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announceFinal ? 'Cabinet editions displayed.' : ''}
      </p>
    </section>
  );
}

export default AuraCollectionCabinet;
