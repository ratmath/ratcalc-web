import { describe, expect, test } from "bun:test";
import { Integer, R, Rational, RationalInterval } from "@ratmath/core";
import { LONG_TEXT, allFormats, boundedDecimal, compact, directedScientific } from "../src/compact-display.js";
import { PRESETS, evaluateExpression } from "../src/named-functions.js";

const hugeValue = () => evaluateExpression("EXP(-x^2)", {
  vars: { x: R`3/2`, d: new Integer(3) },
  functions: { EXP: { ...PRESETS.find(({ name }) => name === "EXP"), terms: "100" } },
});

describe("bounded decimals", () => {
  test("small denominators keep exact repeating notation", () => {
    expect(boundedDecimal(R`1/7`)).toBe("0.#142857");
    expect(boundedDecimal(R`1/8`)).toBe("0.125");
    expect(boundedDecimal(R`5`)).toBe("5");
    expect(boundedDecimal(new Integer(3))).toBe("3");
  });

  test("huge denominators are truncated quickly and marked", () => {
    const value = hugeValue();
    const started = performance.now();
    const text = boundedDecimal(value.low);
    expect(performance.now() - started).toBeLessThan(100);
    expect(text.startsWith("0.1053992245618643")).toBe(true);
    expect(text.endsWith("…")).toBe(true);
    expect(boundedDecimal(new Rational(1n, 2n ** 80n), 10)).toBe("0.0000000000…");
    expect(boundedDecimal(new Rational(3n, 2n ** 20n), 30)).toBe("0.00000286102294921875");
  });
});

describe("compact display", () => {
  const format = (value) => (value instanceof RationalInterval ? `[${value.low}, ${value.high}]` : String(value));

  test("short values are untouched", () => {
    expect(compact(R`22/7`, format)).toEqual({ text: "22/7", shortened: false });
  });

  test("long intervals are shortened outward so they still enclose", () => {
    const value = hugeValue();
    const started = performance.now();
    const { text, shortened } = compact(value, format);
    expect(performance.now() - started).toBeLessThan(100);
    expect(shortened).toBe(true);
    expect(text.length).toBeLessThan(2 * LONG_TEXT);
    const [low, high] = text.slice(1, -1).split(", ").map((part) => R([part]));
    expect(low.lessThanOrEqual(value.low) && high.greaterThanOrEqual(value.high)).toBe(true);
  });

  test("long scalars use scientific notation and other values are cut", () => {
    const long = new Rational(10n ** 50n + 1n, 3n);
    expect(compact(long, format).text).toBe("3.33333333333333_^49…");
    expect(compact({ toString: () => "x".repeat(60) }, String).text).toBe(`${"x".repeat(LONG_TEXT)}…`);
  });

  test("directed scientific rounding", () => {
    expect(directedScientific(R`2/3`, 3, "down")).toBe("6.66_^-1");
    expect(directedScientific(R`2/3`, 3, "up")).toBe("6.67_^-1");
    expect(directedScientific(R`-2/3`, 3, "down")).toBe("-6.67_^-1");
    expect(directedScientific(R`9999/1000`, 2, "up")).toBe("1_^1");
    expect(directedScientific(R`0`, 3, "up")).toBe("0");
    expect(directedScientific(R`120`, 3, "down")).toBe("1.2_^2");
  });

  test("the full-value dialog lists every format quickly", () => {
    const started = performance.now();
    const rows = allFormats(hugeValue());
    expect(performance.now() - started).toBeLessThan(100);
    expect(rows.map(([label]) => label)).toEqual(["Interval", "Low (decimal)", "High (decimal)", "Width", "Enclosing scientific"]);
    expect(allFormats(R`22/7`).map(([, text]) => text)).toEqual(["22/7", "3..1/7", "3.#142857", "3.1428571428571428571…", "3.~7"]);
  });
});
