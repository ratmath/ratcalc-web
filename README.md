# RatWeb

Web pages for [RatMath](../..): **RatCalc** (`docs/calc.html`), a JavaScript
calculator with exact rational and interval arithmetic; **RatTree**, the
Stern-Brocot explorer; and the **showcase** of the Core JavaScript API. `docs/` is the published site.

## RatCalc

RatCalc is a thin page over the shared calculator session from
[`apps/calc`](../calc) (`ratcalc/session`). Input is JavaScript; RatMath Core's
classes and parsers are in scope, the `R` tag gives exact arithmetic on Core
literals, and Core results are shown exactly.

```text
> R`1:2 + 3`
4:5
> let x = R`1/3`
1/3 = 0.#3
> R`(${x} + 1) ^ 2`
16/9 = 1.#7
> [1, 2, 3, 4].map(n => R`1/${n}`)
[1, 1/2, 1/3, 1/4]
> 0.1 + 0.2
0.30000000000000004 (inexact JS number; R`…` keeps it exact)
```

- Literals inside ``R`…` `` use RiX's spelling: `3.~7~15~1`, `2.5_^-2` (no `E`),
  `0xff.8`, `1.2[3:6]`; ``R.base(16)`ff.8` `` reads another base.
- `sum`, `product`, `seq`, `range` replace the old `SUM`/`PROD`/`SEQ`.
- `display("both" | "exact" | "decimal" | "mixed" | "cf" | "sci")`, `digits(n)`,
  `sciDigits(n)`, an output base with `hex()`/`bin()`/`oct()`/`base(n)`/`dec()`,
  one-value formatters `hex(x)`, `cf(x)`, `mix(x)`, `deci(x)`, `sci(x)`,
  `inBase(x, n)`, and `help(x)` for a value's methods; `vars()`, `clear()`,
  `help()`, `ans`; click a result to reuse it as ``R`…` ``. The full mapping
  from old commands is in [`apps/calc`](../calc/README.md#from-the-old-calculator).
- Interval results have a 📊 visualization (drag endpoints, export SVG/HTML).
- The phone layout has a keypad with `R`, backtick and `${` keys and a command
  panel for the display modes.
- Sandboxing: `calc.html` sets a Content-Security-Policy with
  `connect-src 'none'` and scripts from the site only, so calculator input
  cannot reach the network or import remote code; the session also hides
  `fetch`, `import`, `document`, `window` and similar names.

The look (gradient, card, monospace history, flush keypad) is the legacy
RatCalc styling in `docs/calc.css`.

## Showcase (`docs/showcase.html`)

Demonstrates the Core JavaScript API: example boxes evaluate their text with
`R` (basic arithmetic, repeating decimals, intervals with width/midpoint/
shortest decimal, continued fractions with convergents and best
approximation, bases), and a playground runs plain JavaScript with every Core
export plus `show`, `hex`, `bin`, `inBase` and `sci` in scope.

## RatTree (`docs/stern-brocot.html`)

The Stern-Brocot explorer uses Core's `Fraction` tree methods. "Jump to
fraction" and the "Expression (using x)" box read exact `R` expressions
(`3.~7~15`, `0.#3`, `x^2 - 2`), with the current node inserted for `x`.
Scientific display uses the RiX spelling (`2.33333_^0…`).

## Building and testing

```bash
bun run build-all     # rebuilds docs/calc.js and the other bundles
bun test tests        # web calculator and interval visualization tests
bun run serve         # http://localhost:3000/calc.html
```

## What changed

RatCalc used to run the legacy calculator language (`@ratmath/algebra`'s
`VariableManager` with `@ratmath/parser` and `@ratmath/stdlib`). It is now
JavaScript plus Core's `R` tag; the old commands are now functions (see
above). Dropped: the comma interval form and `E` notation (RiX spells them
`[a:b]` and `_^`), the multiplicative meaning of `**` (use `.mpow(n)`),
`?load=` module URLs and the `reals.js`/`oracles.js` bundles, multi-step
expression-tree visualizations, and the legacy-grammar tests. The showcase
and RatTree no longer use the legacy parser (they used `Parser.parse` and the
parser's `R`/`F`); webcalc now depends only on Core and the shared session.
RatTree's precision box is gone: the legacy parser had no transcendental
functions, so it never changed a result.
