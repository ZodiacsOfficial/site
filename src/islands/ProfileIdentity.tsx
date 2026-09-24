/**
 * The head of /profile/: who this page belongs to. Before hydration, or
 * with no chart marked as yours, it is the page's plain introduction. Once
 * a chart is marked as yours it becomes your page — your name, your chart
 * mark (or a Sun sign disc, or a photo that stays in this browser), your
 * Sun, Moon and rising, and the two things you come here to do: read today
 * and send your card.
 *
 * Only the explicit self chart can become "you"; a friend's chart never
 * does, however recently it was saved. Everything here reads and writes
 * this browser's storage through the guarded profile stores.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import ChartMark from '../components/ChartMark';
import { useProfile } from '../lib/hooks/useProfile';
import { useMe } from '../lib/hooks/useMe';
import { explicitSelfChart } from '../lib/profile/read-store';
import { markPrimarySelfChart } from '../lib/profile/store';
import {
  DISPLAY_NAME_MAX,
  cleanDisplayName,
  removePhoto,
  resolvedDisplayName,
  saveMe,
} from '../lib/profile/me';
import { preparePhoto, type AvatarKind, type PhotoResult } from '../lib/profile/avatar';
import { OPEN_CARD_EVENT, cardUrl, encodeCardLink, positionsForChart } from '../lib/profile/card-link';
import { chartHandle, selfMarkSource } from '../lib/profile/your-people';
import {
  settledSignIndex,
  settledSunSlug,
  signIndexForMark,
  type ChartMarkSource,
} from '../lib/chart-mark/common';
import { SIGNS, formatLongitude } from '../lib/signs';
import type { SavedChart } from '../lib/profile/schema';
import { useProfileSurface } from '../lib/profile/surface-gate';

type Panel = 'edit' | 'share' | null;

const PHOTO_ERRORS: Record<Exclude<PhotoResult, { ok: true }>['reason'] | 'storage', string> = {
  type: 'That file isn’t a photo this browser can read. Try a JPEG, PNG, or WebP.',
  size: 'That photo is too large. Try one under 15 MB.',
  decode: 'This browser couldn’t open that photo. Try another one.',
  storage: 'This browser wouldn’t keep it. Private browsing or a full disk can do that.',
};

interface Placement {
  label: 'Sun' | 'Moon' | 'Rising';
  lon: number;
  slug: string;
  name: string;
  hue: string;
}

/**
 * Sun, Moon and rising as this chart can honestly state them: with no
 * birth time the Moon is unsettled and there is no rising sign, and a Sun
 * on the edge of a sign on that day is left out rather than guessed.
 */
export function bigThree(chart: SavedChart): Placement[] {
  const timeKnown = chart.birth.timeKnown === true;
  const find = (body: string) => chart.summary.bodies.find((row) => row.body === body)?.lon;
  const rows: { label: Placement['label']; body: string; lon: number | undefined }[] = [
    { label: 'Sun', body: 'Sun', lon: find('Sun') },
    { label: 'Moon', body: 'Moon', lon: find('Moon') },
    { label: 'Rising', body: 'Rising', lon: timeKnown ? chart.summary.angles?.asc : undefined },
  ];
  return rows.flatMap(({ label, body, lon }) => {
    if (lon === undefined || !Number.isFinite(lon)) return [];
    const index = body === 'Rising' ? signIndexForMark(lon) : settledSignIndex(body, lon, timeKnown);
    if (index === null) return [];
    const sign = SIGNS[index];
    return [{ label, lon, slug: sign.slug, name: sign.name, hue: sign.hue }];
  });
}

function PlacementChips({ placements }: { placements: Placement[] }) {
  if (placements.length === 0) return null;
  return (
    <div class="pf-chart__three pf-me__three">
      {placements.map((placement) => (
        <a
          class="pf-chip"
          href={`/${placement.slug}/`}
          style={`--sign:${placement.hue}`}
          key={placement.label}
          title={formatLongitude(placement.lon, 'en')}
        >
          <picture class="pf-chip__icon">
            <source srcset={`/assets/zodiac-icons/48/${placement.slug}.avif`} type="image/avif" />
            <img src={`/assets/zodiac-icons/48/${placement.slug}.webp`} width="16" height="16" alt="" loading="lazy" decoding="async" />
          </picture>
          <span class="pf-chip__label">{placement.label}</span> {placement.name}
        </a>
      ))}
    </div>
  );
}

function Intro() {
  return (
    <div class="pf-hero">
      <em class="kicker">Your astrology</em>
      <h1 class="display">Your charts, today and ahead.</h1>
      <p>Return to your chart, see what is active now, and keep the forecasts and moments you choose in one timeline.</p>
    </div>
  );
}

/** Pick which saved chart is yours, by name only — never birth details beside it. */
function SelfChooser({ charts }: { charts: SavedChart[] }) {
  const [error, setError] = useState(false);
  const recent = [...charts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  return (
    <section class="pf-me-choose" aria-labelledby="pf-me-choose-title">
      <h2 id="pf-me-choose-title">Which of these charts is yours?</h2>
      <p>Choose one to make this page yours. The others stay with your people.</p>
      <div class="pf-me-choose__list">
        {recent.map((chart) => (
          <button
            key={chart.id}
            type="button"
            class="pf-me-choose__option"
            onClick={() => setError(!markPrimarySelfChart(chart.id))}
          >
            <ChartMark source={selfMarkSource(chart)} size={28} />
            <span>{chartHandle(chart.name)}</span>
          </button>
        ))}
      </div>
      {charts.length > recent.length && (
        <a class="pfd__more" href="#saved-charts">See every saved chart</a>
      )}
      {error && <p class="field__error" role="alert">This browser wouldn’t save that choice. Try again.</p>}
    </section>
  );
}

function useDocumentIdentity(chart: SavedChart | null, name: string | null, icon: string | null) {
  useEffect(() => {
    if (!chart) return;
    const title = document.title;
    document.title = `${name ?? 'Your page'} | Zodiacs.org`;
    const links = icon ? Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')) : [];
    const previous = links.map((link) => [link.getAttribute('href'), link.getAttribute('type')] as const);
    const type = icon?.startsWith('data:image/webp') ? 'image/webp'
      : icon?.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png';
    for (const link of links) {
      link.setAttribute('href', icon!);
      link.setAttribute('type', type);
    }
    return () => {
      document.title = title;
      links.forEach((link, index) => {
        const [href, previousType] = previous[index];
        if (href !== null) link.setAttribute('href', href);
        if (previousType !== null) link.setAttribute('type', previousType);
        else link.removeAttribute('type');
      });
    };
  }, [chart?.id, name, icon]);
}

export default function ProfileIdentity({ accountBound = false }: { accountBound?: boolean }) {
  const { profile, ready: profileReady } = useProfile();
  const surface = useProfileSurface(accountBound);
  const ready = profileReady && surface;
  const me = useMe();
  const self = useMemo(() => (ready ? explicitSelfChart(profile.charts) : null), [ready, profile.charts]);
  const source: ChartMarkSource | null = useMemo(() => selfMarkSource(self), [self]);
  const name = resolvedDisplayName(me, self?.name ?? null);
  const sunSlug = settledSunSlug(source);
  const [panel, setPanel] = useState<Panel>(null);
  const headRef = useRef<HTMLElement>(null);

  const icon = me.avatar === 'photo' && me.photo ? me.photo
    : sunSlug ? `/assets/zodiac-icons/128/${sunSlug}.png` : null;
  useDocumentIdentity(self, name, icon);

  useEffect(() => {
    const open = () => {
      setPanel('share');
      requestAnimationFrame(() => headRef.current?.scrollIntoView({ block: 'start' }));
    };
    window.addEventListener(OPEN_CARD_EVENT, open);
    return () => window.removeEventListener(OPEN_CARD_EVENT, open);
  }, []);

  if (!ready || !self || !source) {
    return (
      <>
        <Intro />
        {ready && !self && profile.charts.length > 0 && <SelfChooser charts={profile.charts} />}
      </>
    );
  }

  const sunHue = sunSlug ? SIGNS.find((sign) => sign.slug === sunSlug)!.hue : 'var(--accent)';
  const toggle = (next: Exclude<Panel, null>) => setPanel((current) => (current === next ? null : next));

  return (
    <header class="pf-me" style={`--sign:${sunHue}`} ref={headRef} data-profile-identity>
      <div class="pf-me__id">
        <ChartMark
          class="pf-me__mark"
          source={source}
          size={112}
          avatar={me.avatar}
          photo={me.photo}
          label={me.avatar === 'photo' && me.photo ? 'Your photo' : 'Your chart mark, drawn from your placements'}
        />
        <div class="pf-me__text">
          <em class="kicker">Your page</em>
          <h1 class="display">{name ?? 'Your chart'}</h1>
          <PlacementChips placements={bigThree(self)} />
          <p class="pf-me__where mono">{accountBound ? 'zodiacs.org/me' : 'zodiacs.org/me · kept in this browser'}</p>
        </div>
      </div>
      <div class="pf-me__actions">
        <a class="btn btn--glass" href="/today/">
          <span>Today’s reading</span><span class="orb" aria-hidden="true">→</span>
        </a>
        <button
          class="btn btn--ghost"
          type="button"
          aria-expanded={panel === 'share'}
          aria-controls="pf-me-share"
          onClick={() => toggle('share')}
          data-card-share-toggle
        >
          Send your card
        </button>
        <button
          class="btn btn--ghost"
          type="button"
          aria-expanded={panel === 'edit'}
          aria-controls="pf-me-edit"
          onClick={() => toggle('edit')}
        >
          Name and picture
        </button>
      </div>
      {panel === 'edit' && (
        <EditPanel
          source={source}
          initialName={me.displayName ?? name ?? ''}
          initialAvatar={me.avatar}
          photo={me.photo}
          canUseSign={sunSlug !== null}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'share' && (
        <SharePanel chart={self} name={name} onAddName={() => setPanel('edit')} />
      )}
    </header>
  );
}

function EditPanel({ source, initialName, initialAvatar, photo, canUseSign, onClose }: {
  source: ChartMarkSource;
  initialName: string;
  initialAvatar: AvatarKind;
  photo: string | null;
  canUseSign: boolean;
  onClose: () => void;
}) {
  const [draftName, setDraftName] = useState(initialName);
  const [avatar, setAvatar] = useState<AvatarKind>(initialAvatar);
  const [draftPhoto, setDraftPhoto] = useState<string | null>(photo);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPhoto(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setBusy(true);
    setMessage('');
    const result = await preparePhoto(file);
    setBusy(false);
    if (!result.ok) {
      setMessage(PHOTO_ERRORS[result.reason]);
      return;
    }
    setDraftPhoto(result.dataUrl);
    setAvatar('photo');
  }

  function onSubmit(event: Event) {
    event.preventDefault();
    const saved = saveMe({
      displayName: cleanDisplayName(draftName),
      avatar: avatar === 'photo' && !draftPhoto ? 'mark' : avatar,
      photo: draftPhoto,
    });
    if (!saved) {
      setMessage(PHOTO_ERRORS.storage);
      return;
    }
    onClose();
  }

  function onRemovePhoto() {
    if (!removePhoto() && photo) {
      setMessage(PHOTO_ERRORS.storage);
      return;
    }
    setDraftPhoto(null);
    if (avatar === 'photo') setAvatar('mark');
  }

  const options: { kind: AvatarKind; title: string; help: string }[] = [
    { kind: 'mark', title: 'Chart mark', help: 'Drawn from your placements' },
    ...(canUseSign ? [{ kind: 'sign' as const, title: 'Sun sign', help: 'Your Sun sign’s disc' }] : []),
    ...(draftPhoto ? [{ kind: 'photo' as const, title: 'Photo', help: 'Kept in this browser' }] : []),
  ];

  return (
    <form class="pf-me__panel" id="pf-me-edit" onSubmit={onSubmit} aria-label="Name and picture">
      <label class="pf-me__field">
        <span>Your name</span>
        <input
          class="field__input"
          type="text"
          value={draftName}
          maxLength={DISPLAY_NAME_MAX}
          autoComplete="given-name"
          placeholder="A first name or nickname"
          onInput={(event) => setDraftName((event.currentTarget as HTMLInputElement).value)}
        />
        <small>Shown on this page and on any card you send.</small>
      </label>
      <fieldset class="pf-me__pictures">
        <legend>Picture</legend>
        {options.map((option) => (
          <label class="pf-me__picture" key={option.kind}>
            <input
              type="radio"
              name="pf-me-picture"
              value={option.kind}
              checked={avatar === option.kind}
              onChange={() => setAvatar(option.kind)}
            />
            <ChartMark source={source} size={56} avatar={option.kind} photo={draftPhoto} />
            <span>
              <strong>{option.title}</strong>
              <small>{option.help}</small>
            </span>
          </label>
        ))}
        {!draftPhoto && (
          <button class="pf-me__picture pf-me__picture--add" type="button" onClick={() => fileRef.current?.click()} disabled={busy}>
            <span class="pf-me__picture-add" aria-hidden="true">+</span>
            <span>
              <strong>{busy ? 'Preparing photo…' : 'Photo'}</strong>
              <small>Choose one from this device</small>
            </span>
          </button>
        )}
      </fieldset>
      <input ref={fileRef} class="sr-only" type="file" accept="image/*" tabIndex={-1} onChange={onPhoto} aria-hidden="true" />
      {draftPhoto && (
        <div class="pf-me__photo-row">
          <button class="pf-me__text-action" type="button" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? 'Preparing photo…' : 'Choose a different photo'}
          </button>
          <button class="pf-me__text-action" type="button" onClick={onRemovePhoto}>Remove photo</button>
        </div>
      )}
      <p class="pf-me__note">A photo is cropped and resized here, then kept in this browser. It is never uploaded.</p>
      {message && <p class="field__error" role="alert">{message}</p>}
      <div class="pf-me__panel-actions">
        <button class="btn btn--glass" type="submit" disabled={busy}>
          <span>Save</span><span class="orb" aria-hidden="true">✓</span>
        </button>
        <button class="btn btn--ghost" type="button" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

type CopyState = 'idle' | 'copied' | 'manual' | 'shared';

function SharePanel({ chart, name, onAddName }: {
  chart: SavedChart;
  name: string | null;
  onAddName: () => void;
}) {
  const [state, setState] = useState<CopyState>('idle');
  const [canShare, setCanShare] = useState(false);
  const token = useMemo(() => encodeCardLink({ chart: positionsForChart(chart), label: name }), [chart, name]);
  const url = token ? cardUrl(window.location.origin, token) : null;

  useEffect(() => {
    setCanShare(typeof navigator.share === 'function');
  }, []);
  useEffect(() => setState('idle'), [url]);

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
    } catch {
      setState('manual');
    }
  }

  async function share() {
    if (!url) return;
    try {
      await navigator.share({
        title: name ? `${name}’s chart card` : 'A chart card',
        text: 'Keep my chart card on your Zodiacs.org page, and send me yours.',
        url,
      });
      setState('shared');
    } catch {
      // A dismissed share sheet is not an error; the copy button remains.
    }
  }

  return (
    <div class="pf-me__panel" id="pf-me-share" role="group" aria-label="Send your card">
      <p>
        {name
          ? <>Your card carries the name <strong>{name}</strong> and your chart’s positions</>
          : 'Your card carries your chart’s positions and no name'}
        {' '}— not your birth date, time, or place. The Sun’s position does show roughly when your
        birthday falls.
      </p>
      <p>
        It opens on their own Zodiacs.org page, where they can keep you with their people and send
        theirs back. Nothing is stored on our side.
      </p>
      {chart.birth.timeKnown !== true && (
        <p class="pf-me__note">Without a birth time, your card has no rising sign and shows your Moon as unsettled.</p>
      )}
      {!name && (
        <p class="pf-me__note">
          Add a name so they know who it’s from.{' '}
          <button class="pf-me__text-action" type="button" onClick={onAddName}>Add your name</button>
        </p>
      )}
      {url ? (
        <>
          <div class="pf-me__panel-actions">
            <button class="btn btn--glass" type="button" onClick={copy} data-card-link>
              <span>{state === 'copied' ? 'Link copied' : 'Copy card link'}</span>
              <span class="orb" aria-hidden="true">{state === 'copied' ? '✓' : '⧉'}</span>
            </button>
            {canShare && (
              <button class="btn btn--ghost" type="button" onClick={share}>Share…</button>
            )}
          </div>
          {state === 'manual' && (
            <input
              class="field__input calc__share-url"
              type="text"
              readOnly
              value={url}
              aria-label="Your card link"
              onFocus={(event) => (event.currentTarget as HTMLInputElement).select()}
            />
          )}
          <p class="sr-only" role="status">{state === 'copied' ? 'Link copied' : state === 'shared' ? 'Card shared' : ''}</p>
        </>
      ) : (
        <p class="field__error" role="alert">
          This chart can’t make a card yet. Open it once in the birth chart calculator and save it again.
        </p>
      )}
    </div>
  );
}
