/**
 * RatTree JavaScript functions: compile a function's code, give it its scope,
 * and normalise what it returns.
 *
 * A function is { name, code }. The code is a JavaScript function body, or a
 * single expression (returned automatically). In scope:
 *   x, d                  the argument (current node, or F(expr)'s value) and depth
 *   every Core export     R, Rational, Integer, RationalInterval, sum, product,
 *                         seq, range, ExactList, exact, parseNumber, ...
 *   helpers               pow, factorial, abs, bound, ceil, floor, pm, expr, taylor
 *   other functions       by name: G(value) or G() for G(x)
 *   analytic              @ratmath/analytic at 30 digits: exp, log, log1p, sqrt,
 *                         sin, cos, tan, atan, sinh, cosh, tanh (certified
 *                         intervals for numbers, Taylor models for models),
 *                         model, integral, series, pi, e, TM, Domain; also by
 *                         name, except range (Core's range wins: use
 *                         analytic.range). createScope({ digits }) makes another.
 *   lib                   all of the above as one object
 * User code runs in its own block, so it may declare any of these names
 * (const e = ...) without a clash.
 * It returns a Core value (Integer, Rational, RationalInterval), a bigint or
 * safe integer, a literal string, or an object with .at(x) (a model, evaluated
 * at x).
 *
 * This module runs inside the RatTree worker; blocked names are shadowed so
 * user code cannot reach the network or the worker's messaging.
 */
import * as Core from "@ratmath/core";
import { createScope } from "@ratmath/analytic";
import { evaluateExpression, magnitude } from "./named-functions.js";

const { Integer, Rational, RationalInterval } = Core;
const { default: _coreDefault, ...coreExports } = Core;

export const BLOCKED_NAMES = [
  "fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "Worker", "SharedWorker",
  "postMessage", "close", "self", "globalThis", "navigator", "location", "caches", "indexedDB",
  "BroadcastChannel", "MessageChannel", "require", "process", "Bun", "Deno",
];

const asExact = (value) => {
  if (value instanceof Integer || value instanceof Rational || value instanceof RationalInterval) return value;
  if (value?.isCertifiedApproximation === true) return value;
  if (typeof value === "bigint") return new Integer(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new TypeError(`${value} is an inexact JavaScript number; use R\`…\` or new Rational(p, q)`);
    return new Integer(value);
  }
  if (typeof value === "string") return Core.parseNumber(value);
  throw new TypeError(`expected an exact value, got ${value === null ? "null" : typeof value}`);
};
const asRational = (value) => (value instanceof Integer ? value.toRational() : value);
const whole = (value, name) => {
  const exact = asExact(value);
  if (!(exact instanceof Integer)) throw new TypeError(`${name} needs a whole number`);
  return exact.value;
};

/** Power with the series convention v^0 = 1 (also for 0 and intervals containing 0). */
export function pow(base, exponent) {
  const n = whole(exponent, "pow's exponent");
  if (n === 0n) return new Integer(1);
  return asExact(base).pow(n);
}

export function factorial(value) {
  return new Integer(whole(value, "factorial")).factorial();
}

/** |v|: an interval for interval input. */
export function abs(value) {
  return evaluateExpression("ABS(x)", { vars: { x: asExact(value) }, functions: null });
}

/** Largest |v| (a Rational): for remainder bounds over an interval argument. */
export function bound(value) {
  return magnitude(asExact(value));
}

/** Ceiling (of the upper end for an interval) and floor (of the lower end). */
export function ceil(value) {
  const exact = asExact(value);
  return new Integer(exact instanceof RationalInterval ? exact.high.ceil() : asRational(exact).ceil());
}

export function floor(value) {
  const exact = asExact(value);
  return new Integer(exact instanceof RationalInterval ? exact.low.floor() : asRational(exact).floor());
}

/** center ± radius as an interval (the center itself when the radius is 0). */
export function pm(center, radius) {
  const r = bound(radius);
  const c = asExact(center);
  if (r.equals(Rational.zero)) return c;
  return c.add(new RationalInterval(r.negate(), r));
}

export const HELPERS = { pow, factorial, abs, bound, ceil, floor, pm };

/** Extra libraries offered to user code (e.g. { analytic: {...} }); merged into scope. */
const LIBRARIES = {};
export function registerLibrary(name, exports) {
  LIBRARIES[name] = exports;
}

/** @ratmath/analytic at 30 digits, plus createScope for other precisions. */
export const ANALYTIC = Object.freeze({ ...createScope({ digits: 30 }), createScope });
registerLibrary("analytic", ANALYTIC);

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const RESERVED = new Set(["x", "d", "lib", "expr", "taylor"]);

/** Names every function can use, in order: Core, helpers, libraries. */
function baseScope() {
  const scope = { ...coreExports, ...HELPERS };
  for (const [name, exports] of Object.entries(LIBRARIES)) {
    scope[name] = exports;
    for (const [key, value] of Object.entries(exports)) if (!(key in scope)) scope[key] = value;
  }
  return scope;
}

// new Function adds "function anonymous(__ratreeScope\n) {\n"; compile adds
// "use strict" and the scope destructuring (which opens the block the user's
// code runs in), plus "return (" for an expression.
const BODY_OFFSET = 4;
const EXPRESSION_OFFSET = 5;

/** Line number (1-based, in the user's code) from an error's stack, if any. */
export function errorLine(error, offset = BODY_OFFSET) {
  // V8 (Chrome): "... <anonymous>:7:14)"; JavaScriptCore (Safari, Bun): "at anonymous (...:7:14)" and error.line.
  const v8 = /<anonymous>:(\d+):\d+/.exec(String(error?.stack ?? ""));
  const jsc = /at anonymous \(.*?:(\d+):\d+\)/.exec(String(error?.stack ?? ""));
  const raw = v8 ? Number(v8[1]) : jsc ? Number(jsc[1]) : Number.isFinite(error?.lineNumber) ? error.lineNumber : null;
  if (raw === null) return null;
  const line = raw - offset;
  return line >= 1 ? line : null;
}

/**
 * Compile code into fn(x, d, scope). A single expression is returned
 * automatically; otherwise the code is a function body.
 */
export function compile(code, functionNames = []) {
  const source = String(code ?? "");
  if (!source.trim()) throw new SyntaxError("the code is empty");
  const names = ["x", "d", "lib", "expr", "taylor", ...functionNames, ...Object.keys(baseScope()).filter((name) => IDENTIFIER.test(name) && !RESERVED.has(name)), ...BLOCKED_NAMES];
  const parameters = [...new Set(names)];
  const build = (body) => new Function("__ratreeScope", `"use strict";\nconst { ${parameters.map((name) => `${name}`).join(", ")} } = __ratreeScope; {\n${body}\n}`);
  let fn;
  try {
    fn = build(`return (\n${source}\n);`);
    fn.lineOffset = EXPRESSION_OFFSET;
  } catch {
    fn = build(source);
    fn.lineOffset = BODY_OFFSET;
  }
  return fn;
}

/** Turn whatever a function returned into a Core value at argument x. */
export function normalise(result, x) {
  if (result && typeof result === "object" && typeof result.at === "function" && !(result instanceof Rational) && !(result instanceof Integer)) {
    return normalise(result.at(x), x);
  }
  if (result === undefined) throw new TypeError("the code returned nothing; add return …");
  const exact = asExact(result);
  return exact instanceof Rational && exact.denominator === 1n ? new Integer(exact.numerator) : exact;
}

/**
 * Callable functions for evaluation: name -> definition usable by
 * evaluateExpression (kind "js"), plus plain JS callables for user code.
 */
export function buildFunctions(definitions, depth) {
  const compiled = new Map();
  const errors = new Map();
  for (const { name, code } of definitions) {
    try {
      compiled.set(name, compile(code, definitions.map((definition) => definition.name)));
    } catch (error) {
      error.functionName = name;
      errors.set(name, error);
    }
  }
  const evaluatorFunctions = new Map();
  const callables = {};
  const scopeFor = (x, d) => {
    const scope = { ...baseScope(), ...callables, x, d, lib: { ...baseScope() } };
    for (const name of BLOCKED_NAMES) scope[name] = undefined;
    scope.expr = (text) => evaluateExpression(String(text), { vars: { x, d }, functions: evaluatorFunctions });
    scope.taylor = (spec) => evaluateExpression("T", {
      vars: { x, d },
      functions: new Map([...evaluatorFunctions, ["T", { kind: "taylor", ...spec, terms: spec.terms ?? spec.N }]]),
    });
    return scope;
  };
  let callDepth = 0;
  const run = (name, x, d) => {
    if (errors.has(name)) throw errors.get(name);
    if (callDepth > 40) throw new RangeError("functions call each other too deeply (a cycle?)");
    callDepth += 1;
    try {
      return normalise(compiled.get(name)(scopeFor(x, d)), x);
    } catch (error) {
      if (!error.functionName) {
        error.functionName = name;
        error.functionLine = errorLine(error, compiled.get(name)?.lineOffset);
      }
      throw error;
    } finally {
      callDepth -= 1;
    }
  };
  const d = new Integer(depth);
  let currentX = null;
  for (const { name } of definitions) {
    callables[name] = (...args) => run(name, args.length ? asExact(args[0]) : currentX, d);
    evaluatorFunctions.set(name, { kind: "js", apply: (argument) => run(name, argument, d) });
  }
  return {
    functions: evaluatorFunctions,
    errors,
    /** Evaluate one function at x. */
    call(name, x) {
      currentX = x;
      return run(name, x, d);
    },
    /** Evaluate an expression-box expression at x. */
    evaluate(expression, x) {
      currentX = x;
      return evaluateExpression(expression, { vars: { x, d }, functions: evaluatorFunctions });
    },
  };
}

/** Describe an error for display: "F, line 3: message". */
export function describeError(error) {
  const where = [error?.functionName, error?.functionLine ? `line ${error.functionLine}` : null].filter(Boolean).join(", ");
  return `${where ? `${where}: ` : ""}${error?.message ?? String(error)}`;
}

/** Equivalent JavaScript for a saved Formula or Taylor definition (version 1). */
export function migrateDefinition(definition) {
  if (definition.code !== undefined) return { name: definition.name, code: String(definition.code) };
  const quote = (text) => JSON.stringify(String(text ?? ""));
  if (definition.kind === "formula") {
    return { name: definition.name, code: `// migrated formula\nreturn expr(${quote(definition.formula)});` };
  }
  const fields = ["term", "terms", "errorMode", "error", "bound", "order", "domain"]
    .filter((field) => definition[field] !== undefined && definition[field] !== "")
    .map((field) => `  ${field}: ${quote(definition[field])},`);
  return { name: definition.name, code: `// migrated Taylor definition: sum of term for n = 0..terms\nreturn taylor({\n${fields.join("\n")}\n});` };
}

/**
 * Predefined functions that use @ratmath/analytic (shown as their own group):
 * certified values, Taylor models, integrals and user series.
 */
export const ANALYTIC_SNIPPETS = [
  {
    name: "CEXP",
    label: "e\u02e3 certified to 30 digits",
    code: [
      "// @ratmath/analytic: exp(x) is a certified interval with at least 30 correct digits.",
      "// The same goes for log, log1p, sqrt, sin, cos, tan, atan, sinh, cosh, tanh.",
      "// An interval x gives an enclosure of the whole range: try CEXP(0:1).",
      "return exp(x);",
    ].join("\n"),
  },
  {
    name: "CSIN",
    label: "sin x, 10 more digits per level",
    code: [
      "// createScope({ digits }) makes the analytic functions at another precision;",
      "// d is the node's depth, so deeper nodes get more digits.",
      "const A = createScope({ digits: 20 + 10 * Number(d) });",
      "return A.sin(x);",
    ].join("\n"),
  },
  {
    name: "EMODEL",
    label: "e^(sin t) as a Taylor model on [0, 1]",
    code: [
      "// model(f, domain) builds a Taylor model of t -> f(t): a polynomial with exact",
      "// coefficients plus a certified remainder that holds on the whole domain.",
      "// Returning a model evaluates it at x, which must lie in [0, 1].",
      "// A model also has .range(), .integral(), .describe() and .coefficients.",
      "const m = model((t) => exp(sin(t)), R`0:1`);",
      "return m;",
    ].join("\n"),
  },
  {
    name: "ERFI",
    label: "\u222b\u2080\u02e3 e^(\u2212t\u00b2) dt, certified",
    code: [
      "// integral(f, a, b, { pieces }) encloses the integral by integrating Taylor models",
      "// of f on pieces of [a, b]. Inside f, t is a model: use methods for arithmetic",
      "// (t.multiply(t), .add, .subtract, .divide, .negate, .pow(n)).",
      "if (x instanceof RationalInterval) throw new RangeError(\"ERFI needs a point x\");",
      "if (bound(x).numerator === 0n) return 0;",
      "const pieces = 4 + 2 * Number(ceil(bound(x)).value);",
      "return integral((t) => exp(t.multiply(t).negate()), 0, x, { pieces });",
    ].join("\n"),
  },
  {
    name: "GSERIES",
    label: "\u03a3 (x/2)\u1d4f as a user series (ratio rule)",
    code: [
      "// series(domain, spec) builds a model from your coefficients a_k and a rule for the",
      "// tail after degree 12. With rule \"ratio\" you claim |a_(k+1)|\u00b7r \u2264 q\u00b7|a_k| there",
      "// (r = the domain's radius about the centre); the library checks the next 32 terms",
      "// and refuses if the claim fails. The sum is 2/(2 - x) on [-1, 1].",
      "const s = series(R`-1:1`, { centre: 0, coefficient: (k) => R`1/2^${k}`, rule: \"ratio\", q: R`1/2` });",
      "return s;   // compare: R`2/(2 - ${x})`",
    ].join("\n"),
  },
];

/** Predefined functions as JavaScript snippets that open in the editor. */
export const SNIPPETS = [
  {
    name: "EXP",
    label: "e\u02e3 (Taylor, Lagrange bound)",
    code: [
      "// e^x = sum x^n/n! for n = 0..N, plus Taylor's remainder:",
      "// |R| <= M |x|^(N+1)/(N+1)!  with  M = max e^t on [0, x] <= 3^ceil|x|",
      "const N = 12 + Number(d);          // more terms deeper in the tree",
      "const s = sum(0, N, (n) => R`${pow(x, n)} / ${n}!`);",
      "const M = pow(3, ceil(bound(x)));",
      "return pm(s, R`${M} * ${bound(x)}^${N + 1} / ${N + 1}!`);",
    ].join("\n"),
  },
  {
    name: "SIN",
    label: "sin x (Taylor, Lagrange bound)",
    code: [
      "// sin x = sum (-1)^n x^(2n+1)/(2n+1)!; every derivative is at most 1, and the",
      "// next nonzero power after x^(2N+1) is x^(2N+3)",
      "const N = 8;",
      "const s = sum(0, N, (n) => {",
      "  const k = Number(n);",
      "  return R`(-1)^${k} * ${pow(x, 2 * k + 1)} / ${2 * k + 1}!`;",
      "});",
      "return pm(s, R`${bound(x)}^${2 * N + 3} / ${2 * N + 3}!`);",
    ].join("\n"),
  },
  {
    name: "COS",
    label: "cos x (Taylor, Lagrange bound)",
    code: [
      "// cos x = sum (-1)^n x^(2n)/(2n)!; |derivatives| <= 1, next nonzero power x^(2N+2)",
      "const N = 8;",
      "const s = sum(0, N, (n) => {",
      "  const k = Number(n);",
      "  return R`(-1)^${k} * ${pow(x, 2 * k)} / ${2 * k}!`;",
      "});",
      "return pm(s, R`${bound(x)}^${2 * N + 2} / ${2 * N + 2}!`);",
    ].join("\n"),
  },
  {
    name: "LN1P",
    label: "ln(1 + x), |x| < 1",
    code: [
      "// ln(1+x) = sum (-1)^n x^(n+1)/(n+1); geometric tail bound, valid for |x| < 1",
      "const r = bound(x);",
      "if (!r.lessThan(R`1`)) throw new RangeError(\"LN1P needs |x| < 1\");",
      "const N = 30;",
      "const s = sum(0, N, (n) => {",
      "  const k = Number(n);",
      "  return R`(-1)^${k} * ${pow(x, k + 1)} / ${k + 1}`;",
      "});",
      "return pm(s, R`${r}^${N + 2} / (${N + 2} * (1 - ${r}))`);",
    ].join("\n"),
  },
  {
    name: "ATAN",
    label: "arctan x, |x| \u2264 1",
    code: [
      "// arctan x = sum (-1)^n x^(2n+1)/(2n+1); alternating with decreasing terms for",
      "// |x| <= 1, so the error is at most the first omitted term",
      "const r = bound(x);",
      "if (r.greaterThan(R`1`)) throw new RangeError(\"ATAN needs |x| <= 1\");",
      "const N = 30;",
      "const s = sum(0, N, (n) => {",
      "  const k = Number(n);",
      "  return R`(-1)^${k} * ${pow(x, 2 * k + 1)} / ${2 * k + 1}`;",
      "});",
      "return pm(s, R`${r}^${2 * N + 3} / ${2 * N + 3}`);",
    ].join("\n"),
  },
  {
    name: "GEOM",
    label: "1/(1 \u2212 x), |x| < 1",
    code: [
      "// 1/(1-x) = sum x^n; the tail after x^N is at most |x|^(N+1)/(1-|x|)",
      "const r = bound(x);",
      "if (!r.lessThan(R`1`)) throw new RangeError(\"GEOM needs |x| < 1\");",
      "const N = 30;",
      "return pm(sum(0, N, (n) => pow(x, n)), R`${r}^${N + 1} / (1 - ${r})`);",
    ].join("\n"),
  },
  {
    name: "SQRT1P",
    label: "\u221a(1 + x), |x| < 1",
    code: [
      "// sqrt(1+x) = sum binom(1/2, n) x^n; |binom(1/2, k)| decreases, so the tail",
      "// is at most |binom(1/2, N+1)| |x|^(N+1)/(1-|x|)",
      "const r = bound(x);",
      "if (!r.lessThan(R`1`)) throw new RangeError(\"SQRT1P needs |x| < 1\");",
      "const binom = (k) => product(0, k - 1, (j) => R`(1/2 - ${j}) / (${j} + 1)`);",
      "const N = 30;",
      "const s = sum(0, N, (n) => R`${binom(Number(n))} * ${pow(x, n)}`);",
      "return pm(s, R`${bound(binom(N + 1))} * ${r}^${N + 1} / (1 - ${r})`);",
    ].join("\n"),
  },
  {
    name: "NEWTON",
    label: "Newton step toward \u221a2",
    code: [
      "// one exact Newton step for x^2 = 2: try it deep in the tree",
      "return R`(${x} + 2/${x}) / 2`;",
    ].join("\n"),
  },
  {
    name: "SQ",
    label: "x\u00b2",
    code: [
      "R`${x}^2`",
    ].join("\n"),
  },
  {
    name: "RECIP",
    label: "1/x",
    code: [
      "R`1/${x}`",
    ].join("\n"),
  },
];
