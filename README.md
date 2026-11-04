# RatWeb

Web pages for [RatMath](../..): **RatCalc** (`docs/calc.html`), a JavaScript
calculator with exact rational and interval arithmetic; the Stern-Brocot
explorer; and the library showcase. `docs/` is the published site.

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

- `display("both" | "exact" | "decimal" | "mixed" | "cf")`, `digits(n)`,
  `vars()`, `clear()`, `help()`, `ans`; click a result to reuse it as ``R`…` ``.
- Interval results have a 📊 visualization (drag endpoints, export SVG/HTML).
- The phone layout has a keypad with `R`, backtick and `${` keys and a command
  panel for the display modes.
- Sandboxing: `calc.html` sets a Content-Security-Policy with
  `connect-src 'none'` and scripts from the site only, so calculator input
  cannot reach the network or import remote code; the session also hides
  `fetch`, `import`, `document`, `window` and similar names.

The look (gradient, card, monospace history, flush keypad) is the legacy
RatCalc styling in `docs/calc.css`.

## Building and testing

```bash
bun run build-all     # rebuilds docs/calc.js and the other bundles
bun test tests        # web calculator and interval visualization tests
bun run serve         # http://localhost:3000/calc.html
```

## What changed

RatCalc used to run the legacy calculator language (`@ratmath/algebra`'s
`VariableManager` with `@ratmath/parser` and `@ratmath/stdlib`). It is now
JavaScript plus Core's `R` tag. Dropped: the calculator syntax and its commands
(`DECI`, `RAT`, `BOTH`, `SCI`, `CF`, `MIX`, `LIMIT`, base commands), `?load=`
module URLs and optional packages (`reals`, `arith-funs`), multi-step
expression-tree visualizations, and the legacy-grammar tests. The showcase and
Stern-Brocot pages still use the legacy parser.
