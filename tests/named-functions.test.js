import { describe, expect, test } from "bun:test";
import { Integer, R, Rational, RationalInterval } from "@ratmath/core";
import {
  BUILTINS, MAX_TERMS, PRESETS, applyFunction, evaluateExpression, magnitude, nameProblem, nextName, termCount,
} from "../src/named-functions.js";
import { loadDefinitions, saveDefinitions } from "../src/functions-panel.js";

const presets = Object.fromEntries(PRESETS.map((preset) => [preset.name, preset]));
const at = (x, d = 3, functions = presets) => ({ vars: { x, d: new Integer(d) }, functions });
const evaluate = (text, x = R`1`, d = 3, functions = presets) => evaluateExpression(text, at(x, d, functions));

// 30-digit references; the result must enclose [ref, ref + 10^-30].
function encloses(value, digits) {
  const low = new Rational(digits);
  const high = low.add(new Rational(1n, 10n ** 30n));
  const interval = value instanceof RationalInterval ? value : new RationalInterval(value, value);
  return interval.low.lessThanOrEqual(high) && interval.high.greaterThanOrEqual(low);
}

describe("expressions with variables and named functions", () => {
  test("formulas, bare names and calls", () => {
    const functions = { F: { kind: "formula", formula: "x^2 - 2" }, G: { kind: "formula", formula: "x + 1" } };
    expect(String(evaluate("F", R`3/2`, 0, functions))).toBe("1/4");
    expect(String(evaluate("F(x + 1)", R`3/2`, 0, functions))).toBe("17/4");
    expect(String(evaluate("F(G(x)) - G", R`1`, 0, functions))).toBe("0");
    expect(String(evaluate("F (2)", R`1`, 0, functions))).toBe("2");
    expect(String(evaluate("5*d", R`1`, 3))).toBe("15");
    expect(String(evaluate("0xff + 0b1", R`1`))).toBe("256"); // letters inside literals are not names
    expect(evaluate("1/2 + 1/2")).toBeInstanceOf(Integer);
  });

  test("errors name the problem", () => {
    expect(() => evaluate("y")).toThrow("unknown variable 'y'");
    expect(() => evaluate("f(x)")).toThrow("functions are capitalised");
    expect(() => evaluate("Foo")).toThrow("names are capitalised");
    expect(() => evaluate("H")).toThrow("unknown function 'H'");
    expect(() => evaluate("EXP(1, 2)")).toThrow("takes one argument");
    expect(() => evaluate("ABS(1, 2)")).toThrow("ABS takes 1 argument");
    expect(() => evaluate("MAX()")).toThrow();
    expect(() => evaluate("F(1")).toThrow("missing ')'");
    expect(() => evaluate("   ")).toThrow("empty expression");
    const cycle = { A: { kind: "formula", formula: "B" }, B: { kind: "formula", formula: "A" } };
    expect(() => evaluate("A", R`1`, 0, cycle)).toThrow("too deeply");
    expect(() => applyFunction({ kind: "other" }, R`1`, at(R`1`))).toThrow("unknown function kind");
  });

  test("built-ins, including interval arguments", () => {
    expect(String(evaluate("ABS(-3/2)"))).toBe("3/2");
    const abs = evaluate("ABS(-2:1)");
    expect([String(abs.low), String(abs.high)]).toEqual(["0", "2"]);
    const negative = evaluate("ABS(-3:-1)");
    expect([String(negative.low), String(negative.high)]).toEqual(["1", "3"]);
    const positive = evaluate("ABS(1:3)");
    expect([String(positive.low), String(positive.high)]).toEqual(["1", "3"]);
    expect(String(evaluate("FLOOR(7/2)"))).toBe("3");
    expect(String(evaluate("CEIL(7/2)"))).toBe("4");
    expect(String(evaluate("FLOOR(1/2:5/2)"))).toBe("0");
    expect(String(evaluate("CEIL(1/2:5/2)"))).toBe("3");
    expect(String(evaluate("MAX(1, 5/2, x)"))).toBe("5/2");
    expect(String(evaluate("MIN(1, 5/2, x)", R`-1`))).toBe("-1");
    const mixed = evaluate("MAX(0:1, 1/2)");
    expect([String(mixed.low), String(mixed.high)]).toEqual(["1/2", "1"]);
    expect(String(evaluate("BINOM(1/2, 2)"))).toBe("-1/8");
    expect(String(evaluate("BINOM(5, 2)"))).toBe("10");
    expect(() => evaluate("BINOM(5, 1/2)")).toThrow("whole k");
    expect(String(magnitude(R`-3:2`))).toBe("3");
    expect(String(magnitude(R`-5/2`))).toBe("5/2");
    expect(Object.keys(BUILTINS)).toEqual(["ABS", "FLOOR", "CEIL", "MIN", "MAX", "BINOM"]);
  });
});

describe("Taylor functions", () => {
  test("predefined series enclose 30-digit reference values", () => {
    const cases = [
      ["EXP(1)", "25", "2.718281828459045235360287471352"],
      ["EXP(-2)", "30", "0.135335283236612691893999494972"],
      ["SIN(1/2)", "12", "0.479425538604203000273287935215"],
      ["COS(1)", "12", "0.540302305868139717400936607442"],
      ["LN1P(1/2)", "90", "0.405465108108164381978013115464"],
      ["ATAN(1/2)", "45", "0.463647609000806116214256231461"],
      ["GEOM(1/2)", "90", "2"],
      ["SQRT1P(1/2)", "90", "1.224744871391589049098642037352"],
    ];
    for (const [expression, terms, reference] of cases) {
      const name = expression.slice(0, expression.indexOf("("));
      const functions = { ...presets, [name]: { ...presets[name], terms } };
      const value = evaluate(expression, R`1`, 0, functions);
      expect(encloses(value, reference), `${expression} = ${value}`).toBe(true);
      const width = value instanceof RationalInterval ? value.high.subtract(value.low) : new Rational(0);
      expect(width.lessThan(new Rational(1n, 10n ** 20n)), `${expression} width ${width}`).toBe(true);
    }
  });

  test("N may depend on depth and the error bound becomes an interval", () => {
    const T = { kind: "taylor", term: "x^n/n!", terms: "5*d", error: "3^CEIL(ABS(x)) * ABS(x)^(n+1)/(n+1)!" };
    expect(termCount(T, at(R`1`, 3))).toBe(15);
    expect(termCount({ terms: "" }, at(R`1`))).toBe(0);
    const value = applyFunction(T, R`1`, at(R`1`, 3));
    expect(value).toBeInstanceOf(RationalInterval);
    expect(encloses(value, "2.718281828459045235360287471352")).toBe(true);
    expect(() => termCount({ terms: "d/2" }, at(R`1`, 3))).toThrow("whole number");
    expect(() => termCount({ terms: "-1" }, at(R`1`))).toThrow("at least 0");
    expect(() => termCount({ terms: String(MAX_TERMS + 1) }, at(R`1`))).toThrow("limited");
  });

  test("an exact series with no error term returns the exact sum", () => {
    const poly = { kind: "taylor", term: "x^n", terms: "3", error: "" };
    expect(String(applyFunction(poly, R`2`, at(R`2`)))).toBe("15");
    const zeroError = { ...poly, error: "0*x" };
    expect(String(applyFunction(zeroError, R`2`, at(R`2`)))).toBe("15");
  });

  test("series use x^0 = 1, also at x = 0", () => {
    expect(String(evaluate("EXP(0)"))).toBe("1");
    expect(String(evaluate("EXP", R`0`))).toBe("1");
    expect(String(evaluate("COS(0)"))).toBe("1");
    expect(() => evaluate("0^0")).toThrow(); // outside a series, Core's rule stands
  });

  test("interval arguments give enclosures, with x^0 = 1", () => {
    const value = evaluate("EXP(0:1)");
    expect(value.low.lessThanOrEqual(new Rational(1))).toBe(true);
    expect(encloses(value, "2.718281828459045235360287471352")).toBe(true);
    const sine = evaluate("SIN(-1:1)");
    expect(sine.low.lessThanOrEqual(new Rational(-84147, 100000))).toBe(true);
    expect(sine.high.greaterThanOrEqual(new Rational(84147, 100000))).toBe(true);
  });

  test("domains are enforced", () => {
    expect(() => evaluate("LN1P(2)")).toThrow("outside the domain -1:1");
    expect(() => evaluate("ATAN(-3:0)")).toThrow("outside the domain");
    expect(() => evaluate("GEOM(1)")).toThrow("Division by zero");
    expect(String(evaluate("ATAN(1/2:1/2)").low).length).toBeGreaterThan(0);
    const point = { kind: "taylor", term: "x", terms: "0", error: "", domain: "2" };
    expect(() => applyFunction(point, R`1`, at(R`1`))).toThrow("outside the domain 2");
  });

  test("intervals propagate through formulas into later functions", () => {
    const value = evaluate("SQ(1:2) + 1", R`1`);
    expect([String(value.low), String(value.high)]).toEqual(["2", "5"]);
    expect(evaluate("EXP(SIN(1/2))")).toBeInstanceOf(RationalInterval);
  });
});

describe("names and persistence", () => {
  test("next free names and name checks", () => {
    expect(nextName([])).toBe("A");
    expect(nextName(["A", "B"])).toBe("C");
    expect(nextName("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""))).toBe("A1");
    expect(nextName([], "EXP")).toBe("EXP");
    expect(nextName(["EXP", "EXP2"], "EXP")).toBe("EXP3");
    expect(nextName([], "ABS")).toBe("ABS2");
    expect(nameProblem("F", [])).toBeNull();
    expect(nameProblem("f", [])).toContain("capital letters");
    expect(nameProblem("ABS", [])).toContain("built-in");
    expect(nameProblem("F", ["F"])).toContain("already defined");
  });

  test("definitions round-trip through storage and bad data is ignored", () => {
    const store = new Map();
    const storage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
    saveDefinitions(storage, [{ ...presets.EXP }, { name: "F", kind: "formula", formula: "x^2" }]);
    const loaded = loadDefinitions(storage);
    expect(loaded.map(({ name }) => name)).toEqual(["EXP", "F"]);
    expect(loaded[0].error).toBe(presets.EXP.error);
    store.set("ratree.functions.v1", JSON.stringify([{ name: "G", kind: "formula", formula: "x" }, { name: "G", kind: "formula" }, { name: "bad", kind: "formula" }, { name: "H", kind: "other" }, null]));
    expect(loadDefinitions(storage).map(({ name }) => name)).toEqual(["G"]);
    store.set("ratree.functions.v1", "{not json");
    expect(loadDefinitions(storage)).toEqual([]);
    store.set("ratree.functions.v1", "{}");
    expect(loadDefinitions(storage)).toEqual([]);
    expect(loadDefinitions(undefined)).toEqual([]);
    expect(() => saveDefinitions({ setItem() { throw new Error("blocked"); } }, [])).not.toThrow();
  });
});
