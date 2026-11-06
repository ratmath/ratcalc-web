/**
 * Named functions for RatTree's expression box.
 *
 * Expressions are Core R expressions (RiX literal spelling) plus:
 *   - variables: x (the current node), d (its depth), and n inside Taylor
 *     definitions;
 *   - calls: NAME(expr) evaluates expr, then applies the function; a bare NAME
 *     means NAME(x). Names are capitalised: F, G, EXP, LN1P, ...
 *   - built-ins: ABS(v), FLOOR(v), CEIL(v), MIN(a, b, ...), MAX(a, b, ...),
 *     BINOM(a, k) (generalized binomial coefficient a(a-1)...(a-k+1)/k!).
 *
 * A function is either
 *   - a formula: { kind: "formula", formula: "x^2 - 2" }, or
 *   - a Taylor polynomial: { kind: "taylor", term, terms, error, domain }:
 *     the value is S = sum of term(x, n) for n = 0..N plus an error interval
 *     [-E, E]: E is |error(x, n)| at n = N (explicit mode), or in Lagrange mode
 *     M · |x|^k / k! from a derivative bound M = bound(x, n) and order k.
 *     N comes from `terms`, a whole number or a formula in d ("5*d").
 *     `domain` (an R interval such as "-1:1", optional) is where the error
 *     bound is valid; x (or every point of an interval x) must lie in it.
 *
 * Interval inputs propagate through Core interval arithmetic, which encloses
 * the true range of every rational expression, so a Taylor value on an
 * interval x encloses the true function on that interval as long as the error
 * formula bounds the remainder at every point of the domain. On intervals,
 * CEIL rounds the upper end up and FLOOR the lower end down (the conservative
 * choices for bounds that grow with |x|).
 */
import { Integer, R, Rational, RationalInterval } from "@ratmath/core";

export const NAME_PATTERN = /^[A-Z][A-Z0-9]*$/;
export const MAX_TERMS = 2000;
const MAX_CALL_DEPTH = 40;

/**
 * An interval argument inside Taylor terms. Power series use x^0 = 1 for every
 * x; Core leaves (0:1)^0 undefined, so x itself follows the series convention.
 */
class SeriesArgument extends RationalInterval {
  pow(exponent) {
    return BigInt(exponent) === 0n ? new Integer(1) : super.pow(exponent);
  }
}

/** The same convention for an exact argument, so 0^0 = 1 in a series at x = 0. */
class SeriesScalar extends Rational {
  pow(exponent) {
    return BigInt(exponent) === 0n ? new Integer(1) : super.pow(exponent);
  }
}

function seriesArgument(value) {
  if (isInterval(value)) return new SeriesArgument(value.low, value.high);
  const exact = asRational(value);
  return exact instanceof Rational ? new SeriesScalar(exact.numerator, exact.denominator) : value;
}

const asRational = (value) => (value instanceof Integer ? value.toRational() : value);
const simplify = (value) => (value instanceof Rational && value.denominator === 1n ? new Integer(value.numerator) : value);
const isInterval = (value) => value instanceof RationalInterval;

function absolute(value) {
  if (isInterval(value)) {
    const low = value.low.abs();
    const high = value.high.abs();
    if (value.low.lessThanOrEqual(Rational.zero) && value.high.greaterThanOrEqual(Rational.zero)) {
      return new RationalInterval(Rational.zero, low.greaterThan(high) ? low : high);
    }
    return low.lessThan(high) ? new RationalInterval(low, high) : new RationalInterval(high, low);
  }
  return value.abs();
}

/** Upper bound of |value| as a Rational. */
export function magnitude(value) {
  if (isInterval(value)) {
    const low = value.low.abs();
    const high = value.high.abs();
    return low.greaterThan(high) ? low : high;
  }
  return asRational(value).abs();
}

const extreme = (values, pick) => values.reduce((best, value) => {
  const [a, b] = [isInterval(best) ? best : asRational(best), isInterval(value) ? value : asRational(value)];
  if (isInterval(a) || isInterval(b)) {
    const lo = (v) => (isInterval(v) ? v.low : v);
    const hi = (v) => (isInterval(v) ? v.high : v);
    const choose = (p, q) => (pick(p, q) ? p : q);
    return new RationalInterval(choose(lo(a), lo(b)), choose(hi(a), hi(b)));
  }
  return pick(a, b) ? a : b;
});

function binomial(top, count) {
  if (!(count instanceof Integer) || count.value < 0n) throw new Error("BINOM(a, k) needs a whole k ≥ 0");
  let result = new Rational(1);
  const a = asRational(top);
  for (let i = 0n; i < count.value; i += 1n) {
    result = result.multiply(a.subtract(new Rational(i))).divide(new Rational(i + 1n));
  }
  return result;
}

export const BUILTINS = {
  ABS: { arity: [1, 1], apply: ([v]) => absolute(v) },
  FLOOR: { arity: [1, 1], apply: ([v]) => new Integer(isInterval(v) ? v.low.floor() : asRational(v).floor()) },
  CEIL: { arity: [1, 1], apply: ([v]) => new Integer(isInterval(v) ? v.high.ceil() : asRational(v).ceil()) },
  MIN: { arity: [1, Infinity], apply: (args) => extreme(args, (a, b) => a.lessThanOrEqual(b)) },
  MAX: { arity: [1, Infinity], apply: (args) => extreme(args, (a, b) => a.greaterThanOrEqual(b)) },
  BINOM: { arity: [2, 2], apply: ([a, k]) => binomial(a, k) },
};

/** Index just past the parenthesis matching the one at `open`. */
function closingParen(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new SyntaxError("missing ')'");
}

/** Split a call's argument text on top-level commas. */
function splitArguments(text) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "(" || text[i] === "[") depth += 1;
    else if (text[i] === ")" || text[i] === "]") depth -= 1;
    else if (text[i] === "," && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

/**
 * Evaluate an expression. context: { vars: { x, d, n }, functions: Map or
 * object of name -> definition, depth }.
 */
export function evaluateExpression(text, context) {
  const source = String(text ?? "").trim();
  if (!source) throw new SyntaxError("empty expression");
  const depth = context.depth ?? 0;
  if (depth > MAX_CALL_DEPTH) throw new RangeError("functions call each other too deeply (a cycle?)");
  const pieces = [""];
  const values = [];
  const insert = (value) => { values.push(value); pieces.push(""); };
  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    const word = /^[A-Za-z][A-Za-z0-9]*/.exec(rest);
    // A letter right after a digit, '.', '_' or another letter is part of a
    // literal such as 0xff or 0b101, not a name.
    if (!word || (i > 0 && /[0-9A-Za-z_.\]]/.test(source[i - 1]))) {
      pieces[pieces.length - 1] += source[i];
      i += 1;
      continue;
    }
    const name = word[0];
    i += name.length;
    if (/^[a-z]/.test(name)) {
      if (!(name in context.vars) || context.vars[name] === undefined) {
        throw new ReferenceError(`unknown variable '${name}': variables are x and d (and n in Taylor definitions); functions are capitalised, like F(x)`);
      }
      insert(context.vars[name]);
      continue;
    }
    if (!NAME_PATTERN.test(name)) throw new SyntaxError(`'${name}': names are capitalised (F, G, EXP); variables are x, d and n`);
    let args = null;
    const afterSpace = source.slice(i).match(/^\s*/)[0].length;
    if (source[i + afterSpace] === "(") {
      const open = i + afterSpace;
      const close = closingParen(source, open);
      args = splitArguments(source.slice(open + 1, close)).map((arg) => evaluateExpression(arg, context));
      i = close + 1;
    }
    insert(callFunction(name, args, context));
  }
  return simplify(R(pieces, ...values));
}

function lookup(functions, name) {
  if (!functions) return undefined;
  return functions instanceof Map ? functions.get(name) : functions[name];
}

function callFunction(name, args, context) {
  const builtin = BUILTINS[name];
  if (builtin) {
    const list = args ?? [context.vars.x];
    const [min, max] = builtin.arity;
    if (list.length < min || list.length > max) throw new TypeError(`${name} takes ${min === max ? min : `${min} or more`} argument${max === 1 ? "" : "s"}`);
    return builtin.apply(list);
  }
  const definition = lookup(context.functions, name);
  if (!definition) throw new ReferenceError(`unknown function '${name}'`);
  if (args && args.length !== 1) throw new TypeError(`${name} takes one argument`);
  return applyFunction(definition, args ? args[0] : context.vars.x, { ...context, name });
}

/** The number of the last Taylor term, N, from a whole number or a formula in d. */
export function termCount(definition, context) {
  const text = String(definition.terms ?? "").trim() || "0";
  const value = evaluateExpression(text, { vars: { d: context.vars.d }, functions: null, depth: 0 });
  if (!(value instanceof Integer)) throw new TypeError(`N = ${text} must give a whole number (got ${value})`);
  if (value.value < 0n) throw new RangeError("N must be at least 0");
  if (value.value > BigInt(MAX_TERMS)) throw new RangeError(`N is limited to ${MAX_TERMS}`);
  return Number(value.value);
}

function checkDomain(definition, x, context) {
  const text = String(definition.domain ?? "").trim();
  if (!text) return;
  const domain = evaluateExpression(text, { vars: { d: context.vars.d }, functions: null, depth: 0 });
  const lo = isInterval(domain) ? domain.low : asRational(domain);
  const hi = isInterval(domain) ? domain.high : asRational(domain);
  const xl = isInterval(x) ? x.low : asRational(x);
  const xh = isInterval(x) ? x.high : asRational(x);
  if (xl.lessThan(lo) || xh.greaterThan(hi)) {
    throw new RangeError(`${context.name ?? "function"}: x = ${x} is outside the domain ${text} where its error bound holds`);
  }
}

/** Apply a definition to an argument value. */
export function applyFunction(definition, argument, context) {
  const vars = { ...context.vars, x: argument };
  const inner = { ...context, vars, depth: (context.depth ?? 0) + 1 };
  if (definition.kind === "formula") return evaluateExpression(definition.formula, inner);
  if (definition.kind !== "taylor") throw new TypeError(`unknown function kind '${definition.kind}'`);
  checkDomain(definition, argument, context);
  const last = termCount(definition, context);
  const seriesX = seriesArgument(argument);
  let total = new Integer(0);
  for (let n = 0; n <= last; n++) {
    total = total.add(evaluateExpression(definition.term, { ...inner, vars: { ...vars, x: seriesX, n: new Integer(n) } }));
  }
  const bound = remainderBound(definition, argument, last, inner, vars);
  if (bound === null) return simplify(total);
  if (bound.equals(Rational.zero)) return simplify(total);
  return simplify(total.add(new RationalInterval(bound.negate(), bound)));
}

/**
 * Upper bound on the remainder, or null for none.
 *  - explicit (default): |error(x, n)| at n = N.
 *  - lagrange: Taylor's theorem, |R| ≤ M · |x|^k / k!, where M = bound(x, n)
 *    bounds |f^(k)| between 0 and x, and k = order(n) (default n + 1) is the
 *    derivative order after the last nonzero power used (2n + 3 for sin's odd
 *    series, 2n + 2 for cos).
 */
function remainderBound(definition, argument, last, inner, vars) {
  const atLast = { ...inner, vars: { ...vars, n: new Integer(last) } };
  if (definition.errorMode === "lagrange") {
    const boundText = String(definition.bound ?? "").trim();
    if (!boundText) throw new SyntaxError("Lagrange mode needs a derivative bound M(x, n)");
    const order = evaluateExpression(String(definition.order ?? "").trim() || "n+1", atLast);
    if (!(order instanceof Integer) || order.value < 1n) throw new TypeError(`the derivative order k must be a whole number ≥ 1 (got ${order})`);
    const derivativeBound = magnitude(evaluateExpression(boundText, atLast));
    let factorial = 1n;
    for (let i = 2n; i <= order.value; i++) factorial *= i;
    return derivativeBound.multiply(magnitude(argument).pow(order.value)).divide(new Rational(factorial));
  }
  const errorText = String(definition.error ?? "").trim();
  if (!errorText) return null;
  return magnitude(evaluateExpression(errorText, atLast));
}

/** First unused name: A, B, ... Z, then A1, B1, ... */
export function nextName(used, preferred) {
  const taken = new Set(used);
  if (preferred && NAME_PATTERN.test(preferred) && !taken.has(preferred) && !BUILTINS[preferred]) return preferred;
  if (preferred) {
    for (let suffix = 2; ; suffix++) {
      const candidate = `${preferred}${suffix}`;
      if (!taken.has(candidate)) return candidate;
    }
  }
  for (let round = 0; ; round++) {
    for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      const candidate = round === 0 ? letter : `${letter}${round}`;
      if (!taken.has(candidate) && !BUILTINS[candidate]) return candidate;
    }
  }
}

/** Reason a name cannot be used, or null. */
export function nameProblem(name, used) {
  if (!NAME_PATTERN.test(name)) return "Names are capital letters and digits, starting with a letter (F, G2, EXP)";
  if (BUILTINS[name]) return `${name} is a built-in`;
  if (used.includes(name)) return `${name} is already defined`;
  return null;
}

/**
 * Common functions with conservative remainder bounds (n = N, the last term).
 *  - EXP, SIN, COS: Lagrange mode (|e^ξ| ≤ 3^ceil|x|; |sin^(k)|, |cos^(k)| ≤ 1).
 *  - LN1P, GEOM, SQRT1P: geometric tail bound, |x| < 1.
 *  - ATAN: alternating series with decreasing terms, |x| ≤ 1.
 */
export const PRESETS = [
  { name: "EXP", label: "eˣ", kind: "taylor", term: "x^n/n!", terms: "10", errorMode: "lagrange", bound: "3^CEIL(ABS(x))", order: "n+1", domain: "", note: "all x; Lagrange with |f^(k)| = e^ξ ≤ 3^⌈|x|⌉" },
  { name: "SIN", label: "sin x", kind: "taylor", term: "(-1)^n * x^(2*n+1)/(2*n+1)!", terms: "8", errorMode: "lagrange", bound: "1", order: "2*n+3", domain: "", note: "all x; Lagrange with |f^(k)| ≤ 1" },
  { name: "COS", label: "cos x", kind: "taylor", term: "(-1)^n * x^(2*n)/(2*n)!", terms: "8", errorMode: "lagrange", bound: "1", order: "2*n+2", domain: "", note: "all x; Lagrange with |f^(k)| ≤ 1" },
  { name: "LN1P", label: "ln(1 + x)", kind: "taylor", term: "(-1)^n * x^(n+1)/(n+1)", terms: "20", error: "ABS(x)^(n+2)/((n+2)*(1 - ABS(x)))", domain: "-1:1", note: "|x| < 1" },
  { name: "ATAN", label: "arctan x", kind: "taylor", term: "(-1)^n * x^(2*n+1)/(2*n+1)", terms: "20", error: "ABS(x)^(2*n+3)/(2*n+3)", domain: "-1:1", note: "|x| ≤ 1" },
  { name: "GEOM", label: "1/(1 − x)", kind: "taylor", term: "x^n", terms: "20", error: "ABS(x)^(n+1)/(1 - ABS(x))", domain: "-1:1", note: "|x| < 1" },
  { name: "SQRT1P", label: "√(1 + x)", kind: "taylor", term: "BINOM(1/2, n) * x^n", terms: "20", error: "ABS(BINOM(1/2, n+1)) * ABS(x)^(n+1)/(1 - ABS(x))", domain: "-1:1", note: "|x| < 1" },
  { name: "SQ", label: "x²", kind: "formula", formula: "x^2", note: "formula" },
  { name: "RECIP", label: "1/x", kind: "formula", formula: "1/x", note: "formula" },
];
