/**
 * Bounded, readable display of exact values for RatTree.
 *
 * - boundedDecimal never searches for a long repeating period: small
 *   denominators get exact repeating notation (0.#3), large ones a truncated
 *   decimal marked with … .
 * - compact abbreviates long values: scalars in scientific form (… marks
 *   rounding), intervals with the low end rounded down and the high end
 *   rounded up, so the abbreviation still encloses the exact interval.
 * The exact value is never changed; the full text is shown on request.
 */
import { Integer, Rational, RationalInterval } from "@ratmath/core";
import { formatScientific } from "ratcalc/session";

export const LONG_TEXT = 40;
const PERIOD_SEARCH_DENOMINATOR = 100_000n;

const asRational = (value) => (value instanceof Integer ? value.toRational() : value);

function terminates(denominator) {
  let rest = denominator;
  while (rest % 2n === 0n) rest /= 2n;
  while (rest % 5n === 0n) rest /= 5n;
  return rest === 1n;
}

/** Decimal text in bounded time; … marks a truncated expansion. */
export function boundedDecimal(value, digits = 30) {
  const rational = asRational(value);
  if (rational.denominator === 1n) return rational.numerator.toString();
  if (rational.denominator <= PERIOD_SEARCH_DENOMINATOR) {
    const result = rational.toRepeatingDecimalWithPeriod({ limit: digits, onLimit: "trunc" });
    return String(result.decimal).replace(/#0$/, "");
  }
  const text = rational.toDecimal(digits);
  return terminates(rational.denominator) && text.split(".")[1]?.length < digits ? text : `${text}…`;
}

/** Scientific text rounded toward -infinity ("down") or +infinity ("up"). */
export function directedScientific(value, significant, direction) {
  const rational = asRational(value);
  if (rational.numerator === 0n) return "0";
  const ten = new Rational(10);
  const magnitude = rational.abs();
  let exponent = magnitude.numerator.toString().length - magnitude.denominator.toString().length;
  while (magnitude.lessThan(ten.pow(exponent))) exponent -= 1;
  while (!magnitude.lessThan(ten.pow(exponent + 1))) exponent += 1;
  const scaled = rational.divide(ten.pow(exponent - significant + 1));
  const units = direction === "down" ? scaled.floor() : scaled.ceil();
  const negative = units < 0n;
  const text = (negative ? -units : units).toString();
  const shift = exponent + (text.length - significant);
  const mantissa = text.length > 1 ? `${text[0]}.${text.slice(1)}`.replace(/\.?0+$/, "") : text;
  return `${negative ? "-" : ""}${mantissa}${shift === 0 ? "" : `_^${shift}`}`;
}

/**
 * A short form for display and whether it was shortened.
 * format(value) gives the full text in the current display mode.
 */
export function compact(value, format, significant = 15) {
  const full = format(value);
  if (full.length <= LONG_TEXT) return { text: full, shortened: false };
  if (value instanceof RationalInterval) {
    return {
      text: `[${directedScientific(value.low, significant, "down")}, ${directedScientific(value.high, significant, "up")}]`,
      shortened: true,
    };
  }
  const rational = asRational(value);
  if (rational instanceof Rational) return { text: formatScientific(rational, significant), shortened: true };
  return { text: `${full.slice(0, LONG_TEXT)}…`, shortened: true };
}

/** Every exact format of a value, for the full-value dialog. */
export function allFormats(value) {
  if (value instanceof RationalInterval) {
    return [
      ["Interval", `${value.low}:${value.high}`],
      ["Low (decimal)", boundedDecimal(value.low, 60)],
      ["High (decimal)", boundedDecimal(value.high, 60)],
      ["Width", String(value.high.subtract(value.low))],
      ["Enclosing scientific", `[${directedScientific(value.low, 20, "down")}, ${directedScientific(value.high, 20, "up")}]`],
    ];
  }
  const rational = asRational(value);
  return [
    ["Fraction", rational.toString()],
    ["Mixed", rational.toMixedString()],
    ["Decimal", boundedDecimal(rational, 60)],
    ["Scientific", formatScientific(rational, 20)],
    ["Continued fraction", rational.toContinuedFractionString()],
  ];
}
