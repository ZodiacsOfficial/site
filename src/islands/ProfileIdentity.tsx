/**
 * The head of /profile/: who this page belongs to. Before hydration, or
 * with no chart marked as yours, it is the page's plain introduction. Once
 * a chart is marked as yours it becomes your page — your name, your chart
 * mark (or a Sun sign disc, or a photo that stays in this browser), your
 * Sun, Moon and rising, and the site's usual trio of actions: one white
 * primary, one ghost, one quiet link. Editing and sending your card open in
 * place of that row, so the header never shows two primaries at once; and
 * while a received card waits at the top of the page, the card holds the
 * white action and the header's steps down to a ghost.
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
import { settledSunSlug, type ChartMarkSource } from '../lib/chart-mark/common';
import PlacementList, { chartPlacements, type Placement } from '../components/PlacementList';
import { SIGNS } from '../lib/signs';
import { t } from '../lib/i18n';
import type { SavedChart } from '../lib/profile/schema';
import { useInboxHoldsPrimary, useProfileSurface } from '../lib/profile/surface-gate';

type Panel = 'edit' | 'share' | null;

const PHOTO_ERRORS: Record<Exclude<PhotoResult, { ok: true }>['reason'] | 'storage', string> = {
  type: 'That file isn’t a photo this browser can read. Try a JPEG, PNG, or WebP.',
  size: 'That photo is too large. Try one under 15 MB.',
  decode: 'This browser couldn’t open that photo. Try another one.',
  storage: 'This browser wouldn’t keep it. Private browsing or a full disk can do that.',
};

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
    <section class="pf-choose shell" aria-labelledby="pf-choose-title">
      <div class="core pf-choose__core">
        <div class="pf-card-head">
          <h2 id="pf-choose-title">Which of these charts is yours?</h2>
          <p>Choose one to make this page yours. The others stay with your people.</p>
        </div>
        <ul class="pf-rows">
          {recent.map((chart) => (
            <li class="pf-row" key={chart.id}>
              <ChartMark source={selfMarkSource(chart)} size={36} />
              <span class="pf-row__text"><strong>{chartHandle(chart.name)}</strong></span>
              <span class="pf-row__actions">
                <button class="pf-chart__action" type="button" onClick={() => setError(!markPrimarySelfChart(chart.id))}>
                  This is me
                </button>
              </span>
            </li>
          ))}
        </ul>
        {charts.length > recent.length && (
          <a class="next-action__quiet pf-choose__more" href="#saved-charts">See every saved chart</a>
        )}
        {error && <p class="field__error" role="alert">This browser wouldn’t save that choice. Try again.</p>}
      </div>
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
  const editButton = useRef<HTMLButtonElement>(null);
  const shareButton = useRef<HTMLButtonElement>(null);
  const closedPanel = useRef<Panel>(null);
  // A card waiting at the top of the page holds the one white action.
  const inboxHoldsPrimary = useInboxHoldsPrimary();

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

  // Closing a panel hands focus back to the action that opened it.
  useEffect(() => {
    if (panel !== null || closedPanel.current === null) return;
    (closedPanel.current === 'edit' ? editButton : shareButton).current?.focus();
    closedPanel.current = null;
  }, [panel]);

  if (!ready || !self || !source) {
    return (
      <>
        <Intro />
        {ready && !self && profile.charts.length > 0 && <SelfChooser charts={profile.charts} />}
      </>
    );
  }

  const sunHue = sunSlug ? SIGNS.find((sign) => sign.slug === sunSlug)!.hue : 'var(--accent)';
  const placements = chartPlacements(self);
  const close = () => {
    closedPanel.current = panel;
    setPanel(null);
  };

  return (
    <header class="pf-me" style={`--sign:${sunHue}`} ref={headRef} data-profile-identity>
      <div class="pf-me__id">
        <div class="pf-me__mark">
          <ChartMark
            source={source}
            size={144}
            fluid
            reveal
            avatar={me.avatar}
            photo={me.photo}
            label={me.avatar === 'photo' && me.photo ? 'Your photo' : 'Your chart mark, drawn from your placements'}
          />
        </div>
        <div class="pf-me__text">
          <em class="kicker">Your page</em>
          <h1 class="display">{name ?? 'Your chart'}</h1>
          <PlacementList placements={placements} />
        </div>
      </div>

      {panel === null && (
        <div class="pf-me__actions">
          <a class={`btn ${inboxHoldsPrimary ? 'btn--ghost' : 'btn--primary'}`} href="/today/">
            <span>{t('en', 'openDailyBrief')}</span><span class="orb" aria-hidden="true">↗</span>
          </a>
          <button class="btn btn--ghost" type="button" ref={shareButton} onClick={() => setPanel('share')} data-card-share-toggle>
            <span>Send your card</span><span class="orb" aria-hidden="true">↗</span>
          </button>
          <button class="pf-quiet" type="button" ref={editButton} onClick={() => setPanel('edit')}>
            Edit name and picture
          </button>
        </div>
      )}
      {panel === 'edit' && (
        <EditPanel
          source={source}
          initialName={me.displayName ?? name ?? ''}
          initialAvatar={me.avatar}
          photo={me.photo}
          canUseSign={sunSlug !== null}
          onClose={close}
        />
      )}
      {panel === 'share' && (
        <SharePanel
          chart={self}
          source={source}
          name={name}
          avatar={me.avatar}
          photo={me.photo}
          placements={placements}
          onAddName={() => setPanel('edit')}
          onClose={close}
        />
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
  const nameRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // The action row this replaces is gone, so focus moves in: to the name
  // with a mouse or keyboard, to the panel on touch (no keyboard pop-up).
  useEffect(() => {
    if (window.matchMedia?.('(pointer: fine)').matches) nameRef.current?.focus();
    else formRef.current?.focus({ preventScroll: true });
  }, []);

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

  const options: { kind: AvatarKind; title: string }[] = [
    { kind: 'mark', title: 'Chart mark' },
    ...(canUseSign ? [{ kind: 'sign' as const, title: 'Sun sign' }] : []),
    ...(draftPhoto ? [{ kind: 'photo' as const, title: 'Photo' }] : []),
  ];

  return (
    <form class="pf-me__panel" id="pf-me-edit" ref={formRef} tabIndex={-1} onSubmit={onSubmit} aria-label="Name and picture">
      <div class="field pf-me__name">
        <label class="field__label" for="pf-me-name">Your name</label>
        <input
          ref={nameRef}
          id="pf-me-name"
          class="field__input"
          type="text"
          value={draftName}
          maxLength={DISPLAY_NAME_MAX}
          autoComplete="given-name"
          placeholder="A first name or nickname"
          onInput={(event) => setDraftName((event.currentTarget as HTMLInputElement).value)}
        />
        <p class="field__help">Shown on this page and on any card you send.</p>
      </div>
      <fieldset class="pf-me__pictures">
        <legend class="field__label">Picture</legend>
        <div class="pf-me__picture-row">
          {options.map((option) => (
            <label class="pf-me__picture" key={option.kind}>
              <input
                class="sr-only"
                type="radio"
                name="pf-me-picture"
                value={option.kind}
                checked={avatar === option.kind}
                onChange={() => setAvatar(option.kind)}
              />
              <span class="pf-me__picture-disc">
                <ChartMark source={source} size={80} fluid avatar={option.kind} photo={draftPhoto} />
              </span>
              <span class="pf-me__picture-name">{option.title}</span>
            </label>
          ))}
          {!draftPhoto && (
            <button class="pf-me__picture" type="button" onClick={() => fileRef.current?.click()} disabled={busy}>
              <span class="pf-me__picture-disc pf-me__picture-disc--add" aria-hidden="true">+</span>
              <span class="pf-me__picture-name">{busy ? 'Preparing…' : 'Photo'}</span>
            </button>
          )}
        </div>
        <p class="field__help">
          A photo is cropped and resized here, then kept in this browser. It is never uploaded.
          {draftPhoto && (
            <>
              {' '}
              <button class="pf-quiet pf-quiet--inline" type="button" onClick={() => fileRef.current?.click()} disabled={busy}>
                Choose another
              </button>
              {' · '}
              <button class="pf-quiet pf-quiet--inline" type="button" onClick={onRemovePhoto}>Remove photo</button>
            </>
          )}
        </p>
      </fieldset>
      <input ref={fileRef} class="sr-only" type="file" accept="image/*" tabIndex={-1} onChange={onPhoto} aria-hidden="true" />
      {message && <p class="field__error" role="alert">{message}</p>}
      <div class="pf-me__panel-actions">
        <button class="btn btn--primary" type="submit" disabled={busy}>
          <span>Save</span><span class="orb" aria-hidden="true">✓</span>
        </button>
        <button class="pf-quiet" type="button" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

type CopyState = 'idle' | 'copied' | 'manual' | 'shared';

function SharePanel({ chart, source, name, avatar, photo, placements, onAddName, onClose }: {
  chart: SavedChart;
  source: ChartMarkSource;
  name: string | null;
  avatar: AvatarKind;
  photo: string | null;
  placements: Placement[];
  onAddName: () => void;
  onClose: () => void;
}) {
  const [state, setState] = useState<CopyState>('idle');
  const [canShare, setCanShare] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const token = useMemo(() => encodeCardLink({ chart: positionsForChart(chart), label: name }), [chart, name]);
  const url = token ? cardUrl(window.location.origin, token) : null;
  // A card carries positions, never a photo: the preview shows what travels.
  const cardAvatar: AvatarKind = avatar === 'photo' ? 'mark' : avatar;

  useEffect(() => {
    setCanShare(typeof navigator.share === 'function');
    panelRef.current?.focus({ preventScroll: true });
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
    <div
      class="pf-me__panel pf-share"
      id="pf-me-share"
      ref={panelRef}
      tabIndex={-1}
      role="group"
      aria-labelledby="pf-share-title"
    >
      <div class="pf-share__layout">
        <div class="pf-share__copy">
          <h2 class="pf-share__title" id="pf-share-title">Send your card</h2>
          <p>
            {name
              ? <>It carries the name <strong>{name}</strong> and your chart’s positions</>
              : 'It carries your chart’s positions and no name'}
            {' '}— not your birth date, time, or place, though the Sun’s position shows roughly when
            your birthday falls.
          </p>
          <p>
            It opens on their own Zodiacs.org page, where they can keep you with their people and send
            theirs back. Nothing is stored on our side.
          </p>
          {chart.birth.timeKnown !== true && (
            <p class="pf-share__note">Without a birth time, your card has no rising sign and shows your Moon as unsettled.</p>
          )}
          {!name && (
            <p class="pf-share__note">
              Add a name so they know who it’s from.{' '}
              <button class="pf-quiet pf-quiet--inline" type="button" onClick={onAddName}>Add your name</button>
            </p>
          )}
        </div>
        {/* A picture of what the copy above says travels; the photo never does. */}
        <figure class="pf-share__preview" aria-hidden="true">
          <div class="pf-share__card">
            <ChartMark source={source} size={64} avatar={cardAvatar} photo={null} />
            <div class="pf-share__card-text">
              <strong>{name ?? 'A chart card'}</strong>
              <PlacementList placements={placements} linked={false} />
            </div>
          </div>
          <figcaption class="mono--label">What they’ll see</figcaption>
        </figure>
      </div>
      {url ? (
        <>
          {state === 'manual' && (
            <input
              class="field__input pf-share__url"
              type="text"
              readOnly
              value={url}
              aria-label="Your card link"
              onFocus={(event) => (event.currentTarget as HTMLInputElement).select()}
            />
          )}
          <div class="pf-me__panel-actions">
            <button class="btn btn--primary" type="button" onClick={copy} data-card-link>
              <span>{state === 'copied' ? 'Link copied' : 'Copy card link'}</span>
              <span class="orb" aria-hidden="true">{state === 'copied' ? '✓' : '⧉'}</span>
            </button>
            {canShare && (
              <button class="btn btn--ghost" type="button" onClick={share}>
                <span>Share</span><span class="orb" aria-hidden="true">↗</span>
              </button>
            )}
            <button class="pf-quiet" type="button" onClick={onClose}>Done</button>
          </div>
          <p class="sr-only" role="status">{state === 'copied' ? 'Link copied' : state === 'shared' ? 'Card shared' : ''}</p>
        </>
      ) : (
        <>
          <p class="field__error" role="alert">
            This chart can’t make a card yet. Open it once in the birth chart calculator and save it again.
          </p>
          <div class="pf-me__panel-actions">
            <button class="pf-quiet" type="button" onClick={onClose}>Done</button>
          </div>
        </>
      )}
    </div>
  );
}
