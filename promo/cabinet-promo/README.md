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
| `TheTenth` | 1080×1080 | 13.1s | **The edition V campaign. Square is the X master.** |
| `TheTenthVertical` | 1080×1920 | 13.1s | Stories / Reels cut of the same film |
| `TheTenthWide` | 1920×1080 | 13.1s | Landscape cut; uses the site's six-column case |
| `CabinetPromo` | 1080×1920 | 18.8s | The original ladder explainer (I→IV) |
| `CabinetPromoWide` | 1920×1080 | 18.8s | Landscape cut of the explainer |

### "The Tenth"

The explainer walks the ladder from I to IV. It teaches, but teaching is not
wanting — so this film is built on one dramatic idea instead:

> A tally climbs to nine. Everything stops. Then the tenth sculpture gilds the
> entire case.

Rules the cut obeys, all of them written for a muted, scrolling timeline:

- **Open already lit.** No title card. Frame zero is a finished composition —
  sculpture, tally, count — because X shows the opening frame as the poster.
- **One idea, stated once.** Every beat serves the tenth. Nothing explains the
  bronze and silver rungs; the site does that.
- **Hold on nine.** Nearly two seconds where the picture and the score both
  stop. Nothing else in the feed stops moving, which is the whole point.
- **Comparative scarcity.** The payoff is not the gold — it is eleven dark
  seats and one lit one. That frame, and the `10,000,000` stamp, are built to
  survive being screenshotted on their own.
- **Read it silent.** All meaning lives in image and type.

Timing lives in one place, `src/tenth/leaf.ts`, and the score is written
against the same frame numbers.

## Audio

Both cues are pure-math synthesis — no samples, no third-party audio, nothing
to clear. The voices are shared in `scripts/synth.mjs`; each cue is a script.

```console
node scripts/make-audio.mjs        # public/score.wav  — Cabinet promo
node scripts/make-tenth-audio.mjs  # public/tenth.wav  — The Tenth
```

Deterministic: the same script always writes the same bytes.

## Rendering the campaign

```console
npx remotion render TheTenth         out/the-tenth-square.mp4
npx remotion render TheTenthVertical out/the-tenth-vertical.mp4
npx remotion render TheTenthWide     out/the-tenth-wide.mp4
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
