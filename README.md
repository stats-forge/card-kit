# @stats-forge/card-kit

The frame, themes, text and query-string boundary the
[stats-forge](https://github.com/stats-forge) cards are drawn with.

```sh
npm install @stats-forge/card-kit
```

A package of cards brings its own fetchers and renderers, and draws them with what this one holds:

- `Card`, `CARD_STYLE` and the render helpers, for a card that looks like the others
- `themes` and `getLightDarkColors`, for one theme or a `light,dark` pair
- `defineLocales` and `localize`, for every word a card draws
- `CardError`, which a package extends with its own failures through `registerFailures`
- `cardHandlerFor` and the param helpers, which parse a query string once into typed options

It is 0.x: a minor release may break the API.
