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
| `TheCabinet` | 1080×1080 | 13.7s | **The campaign film. Square is the X master.** |
| `TheCabinetVertical` | 1080×1920 | 13.7s | Stories / Reels cut of the same film |
| `TheCabinetWide` | 1920×1080 | 13.7s | Landscape cut; uses the site's six-column case |
| `CabinetPromo` | 1080×1920 | 18.8s | The original ladder explainer (I→IV) |
| `CabinetPromoWide` | 1920×1080 | 18.8s | Landscape cut of the explainer |

### "The Cabinet of Twelve"

The subject is the cabinet, not any one edition:

> Twelve numbered niches stand empty. A public record is read. The seats an
> address has earned light up in their materials — and four stay reserved.

Then the ladder is read **in place** across the filled case: I to V, each rung
lighting only the seats that reached it, so the system explains itself without
ever cutting away from the product. The gilding is the last rung, given one
beat, not the plot.

Rules the cut obeys:

- **Museum register.** Void black, EB Garamond, long holds, silence as a
  device. Restraint is the brand; nothing here shouts.
- **Never leave the cabinet.** No explainer cards. That is also what keeps the
  product on screen for twelve of the thirteen seconds.
- **Four seats stay empty.** The reserved niches are the engine; a completed
  case would be a nicer picture and a worse advertisement.
- **Read it silent.** All meaning lives in image and type.

Timing and the displayed standing live in one place, `src/cabinet/palette.ts`,
and the score is written against the same frame numbers.

## Audio

Both cues are pure-math synthesis — no samples, no third-party audio, nothing
to clear. The voices are shared in `scripts/synth.mjs`; each cue is a script.

```console
node scripts/make-audio.mjs          # public/score.wav    — Cabinet promo
node scripts/make-cabinet-audio.mjs  # public/cabinet.wav  — The Cabinet of Twelve
```

Deterministic: the same script always writes the same bytes.

## Rendering the campaign

```console
npx remotion render TheCabinet         out/cabinet-square.mp4
npx remotion render TheCabinetVertical out/cabinet-vertical.mp4
npx remotion render TheCabinetWide     out/cabinet-wide.mp4
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
