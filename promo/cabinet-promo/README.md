# Remotion video

<p align="center">
  <a href="https://github.com/remotion-dev/logo">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-dark.apng">
      <img alt="Animated Remotion Logo" src="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-light.gif">
    </picture>
  </a>
</p>

Promo films for zodiacs.org — the Registry wing's Cabinet of Twelve.

## Compositions

| id | size | length | what it is |
| --- | --- | --- | --- |
| `CabinetPromoWide` | 1920×1080 | 19.3s | **The campaign film.** Five editions, explained one threshold at a time. |
| `CabinetPromo` | 1080×1920 | 19.3s | Vertical cut of the same film |

The film's job is the ladder. A title card, then the case fills in pastel,
and from there each edition gets the same treatment: a full-screen **HOLD**
card counting up to the threshold, then the material landing across the
twelve seats. Bronze at 10,000, Silver at 100,000, Gold at 1,000,000, and
Crown Gold at 10,000,000 — where one seat frames itself in gold and the case
is gilded around it. Tier-to-tier is roughly two thirds of the runtime, which
is what the film is for.

Silver's promotion lives in the case, not the artwork: the niche becomes a
brushed platinum bar with a travelling specular sheen while the medallion
keeps its pastel art. That is what separates it from Bronze at a glance.

## Audio

The cue is pure-math synthesis — no samples, no third-party audio, nothing to
clear. The voices live in `scripts/synth.mjs`.

```console
node scripts/make-audio.mjs   # public/score.wav
```

Deterministic: the same script always writes the same bytes.

## Rendering

```console
npx remotion render CabinetPromoWide out/cabinet-promo-wide.mp4
npx remotion render CabinetPromo     out/cabinet-promo-vertical.mp4
```

## Commands

**Install Dependencies**

```console
npm i
```

**Start Preview**

```console
npm run dev
```

**Render video**

```console
npx remotion render
```

**Upgrade Remotion**

```console
npx remotion upgrade
```

## Docs

Get started with Remotion by reading the [fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

## Help

We provide help on our [Discord server](https://discord.gg/6VzzNDwUwV).

## Issues

Found an issue with Remotion? [File an issue here](https://github.com/remotion-dev/remotion/issues/new).

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
