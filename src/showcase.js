/**
 * RatMath showcase: interactive examples and a playground for the Core
 * JavaScript API — the R tag (RiX-spelled literals), the value classes and
 * their methods, and sum/product/seq/range. Output uses the same formatting
 * as RatCalc (apps/calc/src/session.js).
 */
import * as Core from "@ratmath/core";
import { formatInBase, formatScientific, formatValue } from "ratcalc/session";

const { R, Integer, Rational, RationalInterval } = Core;

// Everything the playground can use by name.
const { default: _defaultExport, ...namedExports } = Core;
export const PLAYGROUND_SCOPE = {
  ...namedExports,
  show: (value) => formatValue(value),
  hex: (value) => formatInBase(value, 16),
  bin: (value) => formatInBase(value, 2),
  inBase: formatInBase,
  sci: formatScientific,
};

const typeName = (value) => value?.constructor?.name ?? typeof value;

/** Lines describing an R expression's value, for each example box. */
export const EXAMPLES = {
  basic(value) {
    return [`${formatValue(value)}   (${typeName(value)})`];
  },
  repeating(value) {
    const lines = [`${formatValue(value)}   (${typeName(value)})`];
    if (value instanceof Rational && value.denominator !== 1n) {
      lines.push(`period: ${value.toRepeatingDecimalWithPeriod(true).period} digits`);
    }
    return lines;
  },
  interval(value) {
    if (!(value instanceof RationalInterval)) return [`${formatValue(value)}   (${typeName(value)})`];
    return [
      `${formatValue(value)}   (RationalInterval)`,
      `width ${value.high.subtract(value.low)}, midpoint ${value.midpoint()}, shortest decimal inside ${value.shortestDecimal()}`,
    ];
  },
  cf(value) {
    const rational = value instanceof Integer ? value.toRational() : value;
    if (!(rational instanceof Rational)) return [`${formatValue(value)}   (${typeName(value)})`];
    return [
      `${formatValue(rational)}`,
      `.toContinuedFractionString()  ${rational.toContinuedFractionString()}`,
      `.convergents()                ${rational.convergents().join(", ")}`,
      `.bestApproximation(100)       ${rational.bestApproximation(100)}`,
    ];
  },
  bases(value) {
    const exact = value instanceof Integer ? value.toRational() : value;
    if (!(exact instanceof Rational)) return [`${formatValue(value)}   (${typeName(value)})`];
    return [
      `${formatValue(exact)}`,
      `hex  ${formatInBase(exact, 16)}`,
      `bin  ${formatInBase(exact, 2)}`,
      `base 7  ${formatInBase(exact, 7)}`,
    ];
  },
};

/** Evaluate an example box's text with R and describe the result. */
export function describeExample(kind, text) {
  try {
    return { ok: true, lines: EXAMPLES[kind](R([text])) };
  } catch (error) {
    return { ok: false, lines: [`Error: ${error.message}`] };
  }
}

/** Run playground code with the Core API in scope; returns its console lines. */
export function runPlaygroundCode(code) {
  const lines = [];
  const format = (args) => args.map((arg) => (typeof arg === "string" ? arg : formatValue(arg))).join(" ");
  const console = { log: (...args) => lines.push(format(args)), error: (...args) => lines.push(`Error: ${format(args)}`) };
  const names = Object.keys(PLAYGROUND_SCOPE);
  try {
    // eslint-disable-next-line no-new-func
    new Function("console", ...names, code)(console, ...names.map((name) => PLAYGROUND_SCOPE[name]));
    return { ok: true, lines };
  } catch (error) {
    lines.push(`Error: ${error.message}`);
    return { ok: false, lines };
  }
}

function showExample(kind) {
  const input = document.getElementById(`${kind}-expr`);
  const output = document.getElementById(`${kind}-output`);
  const result = describeExample(kind, input.value);
  output.textContent = result.lines.join("\n");
  output.style.color = result.ok ? "#28a745" : "#dc3545";
}

function showPlayground() {
  const output = document.getElementById("playground-output");
  const result = runPlaygroundCode(document.getElementById("playground-code").value);
  output.textContent = result.lines.join("\n") || "Code ran (no console.log output)";
  output.style.color = result.ok ? "#abb2bf" : "#e06c75";
}

if (typeof document !== "undefined" && typeof document.getElementById === "function" && document.getElementById("playground-code")) {
  globalThis.RatMath = PLAYGROUND_SCOPE;
  const kinds = Object.keys(EXAMPLES);
  const start = () => {
    for (const kind of kinds) {
      showExample(kind);
      document.getElementById(`${kind}-button`)?.addEventListener("click", () => showExample(kind));
      document.getElementById(`${kind}-expr`).addEventListener("keydown", (event) => { if (event.key === "Enter") showExample(kind); });
    }
    document.getElementById("playground-run").addEventListener("click", showPlayground);
    document.getElementById("playground-clear").addEventListener("click", () => { document.getElementById("playground-output").textContent = ""; });
    document.getElementById("playground-code").addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        showPlayground();
      }
    });
    for (const link of document.querySelectorAll(".nav-link")) {
      link.addEventListener("click", (event) => {
        const target = document.getElementById(link.getAttribute("href").slice(1));
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
}
