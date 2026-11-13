# AGENTS.md

Guidance for Claude Code in this repository. The rules started in
[github-stats-forge](https://github.com/stats-forge/github-stats-forge), the first package drawn
with the kit; a link names the change there holding a rule's full story.

## Before you change anything

- **Don't commit, push, open a PR or comment on one unless asked.**
- **Every change carries a changeset, unasked**: the first line a conventional commit with no
  scope, pre-1.0 a breaking change is `minor`.
- **Run `pnpm check-all` before handing work over**: it is every check CI runs.
- **A change to how a card looks is checked in a consumer**: link this checkout into
  github-stats-forge (`'@stats-forge/card-kit': link:../card-kit` under `overrides` in its
  `pnpm-workspace.yaml`, never committed) and run its `pnpm check-all`, whose `docs:cards:check`
  fails on any byte a card moved.

## What this is

One package, `@stats-forge/card-kit`, with one entry point: everything a package of cards draws
with, and nothing about where its data comes from.

| Module      | What it holds                                                       |
| ----------- | ------------------------------------------------------------------- |
| `markup/`   | The element tree a card is built as, escaped once when serialized   |
| `themes/`   | The palettes, each a `_light` or `_dark` look                       |
| `brand.ts`  | The font stack, type scale, widths and padding: `CARD_STYLE`        |
| `Card.ts`   | The frame: header, heat trail, band, glow, border, both schemes     |
| `render.ts` | Rows, bars, progress, number formats and the error card             |
| `color.ts`  | A theme resolved into colors, per scheme; `inkOn` for legible fills |
| `localize`  | The locales a card can be asked for, and `defineLocales`            |
| `error.ts`  | `CardError` and the failures the boundary throws                    |
| `http.ts`   | The transport a host substitutes, and a JSON-or-text request        |
| `api/`      | The query-string boundary: param helpers, `cardHandlerFor`, results |

**What belongs here is what a second package of cards would otherwise copy.** A GitHub login, a
date range or a rate-limited token pool is the consumer's.

## The seams a consumer fills

- **Failures**: a package words its own in a table, augments `Failures` with the table's type and
  calls `registerFailures(table)` once, in the module its fetchers import `CardError` from, so a
  reason is registered before anything throws it. A reason one card family throws carries its
  prefix; a second wording for a reason throws.
- **Config**: `cardHandlerFor<MyConfig>()` binds the handler to a config with `hints` and an
  `isAllowed(id, kind)`, whose `kind` names the lists an endpoint's identities may be guarded by.
  The kit never reads anything else of it.
- **Rejections**: a package's own param helpers word their rejections in a table of their own,
  through `rejects(wording, passes)` and `patternParam(wording, pattern)`.
- **Icons**: the octicons are here; which icon each card wears is the consumer's table.

## The api layer is the trust boundary

- **Parse and validate once, at the boundary, and leave every default to the renderer.**
- **A value outside what a param accepts is an error, never ignored**
  ([#229](https://github.com/stats-forge/github-stats-forge/pull/229)); unknown params stay ignored.
  Booleans are `true`, `1` or `on` and `false`, `0` or `off`, in any case.
- **`resolveEmpty` resolves an empty value once, in the handler**: an empty boolean is `true`, any
  other empty param absent.
- **A number is digits only, plus an optional `px` on a length.**
- **The theme parses first**: a rejected theme cannot draw its own error card.
- **Every param helper records its kind with `kinded()`**, and the handler carries them as `PARAMS`,
  throwing at import on one without.
- **A failure is not `retryable` unless it declares it, and `reportable` unless it declares
  otherwise**; a `not_found` is never reportable. `CardError.from` wraps anything else as a
  retryable `upstream`.

## Card text and translations

- **Every word a card draws comes from its locale table**; error text is English on purpose.
- **`defineLocales` refuses what would never be drawn or would throw**: an unlisted code, a key `en`
  lacks, a placeholder or plural form `en` does not supply.
- **A number-dependent wording is plural forms, and a whole phrase is one key.**

## Card branding

- **`brand.ts` owns how a card looks**: a card writing its own `font`, pixel size or weight is
  drifting. Every measure is a `CARD_STYLE` entry, read by dot.
- **`Card` defines the heat once, as `url(#heat…)` paints in `HEAT_PAINT`.**
- **Text is never filled with a gradient**
  ([#386](https://github.com/stats-forge/github-stats-forge/pull/386)), and what glows is drawn
  twice through `glowingCircle`
  ([#390](https://github.com/stats-forge/github-stats-forge/pull/390)): WebKit draws both at 1x.
- **An animation fills `backwards` over a base style that is its last frame**
  ([#311](https://github.com/stats-forge/github-stats-forge/pull/311)).

## Commands

```sh
pnpm test             # vitest, one run
pnpm test:coverage    # the same, failing under the floors in vitest.config.ts
pnpm typecheck        # tsc over src, tests and the configs
pnpm lint             # oxlint, type-aware
pnpm lint:knip        # unused files, exports and dependencies
pnpm lint:publish     # attw + publint on the packed tarball
pnpm format           # oxfmt --write .
pnpm check-all        # all of the above, then the build
```

## TypeScript, tests and comments

The same as github-stats-forge's: TypeScript 7 with the strict flags in `tsconfig.base.json`, a
relative import naming the `.ts` file, card tests asserting on the DOM with jest-dom matchers, a
`@file` block first, and a comment stating the reason, never the behaviour.
