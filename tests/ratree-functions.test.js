import { describe, expect, test } from "bun:test";
import { Integer, R, Rational, RationalInterval } from "@ratmath/core";
import {
  BLOCKED_NAMES, SNIPPETS, abs, bound, buildFunctions, ceil, compile, describeError, errorLine, factorial, floor,
  migrateDefinition, normalise, pm, pow, registerLibrary,
} from "../src/ratree-scope.js";
import { handleRequest } from "../src/ratree-runtime.js";
import { FunctionRunner } from "../src/ratree-client.js";
import { summary } from "../src/functions-panel.js";

const encloses = (value, digits) => {
  const low = new Rational(digits);
  const high = low.add(new Rational(1n, 10n ** 30n));
  const interval = value instanceof RationalInterval ? value : new RationalInterval(value, value);
  return interval.low.lessThanOrEqual(high) && interval.high.greaterThanOrEqual(low);
};
const snippets = SNIPPETS.map(({ name, code }) => ({ name, code }));

describe("helpers", () => {
  test("pow uses x^0 = 1; factorial, abs, bound, ceil, floor, pm", () => {
    expect(String(pow(R`0`, 0))).toBe("1");
    expect(String(pow(R`0:1`, 0))).toBe("1");
    expect(String(pow(R`2/3`, 2n))).toBe("4/9");
    expect(String(pow(3, new Integer(2)))).toBe("9");
    expect(() => pow(2, 0.5)).toThrow("inexact");
    expect(() => pow(2, R`1/2`)).toThrow("whole number");
    expect(String(factorial(5))).toBe("120");
    expect(String(abs(R`-3/2`))).toBe("3/2");
    expect(String(bound(R`-3:2`))).toBe("3");
    expect(String(ceil(R`7/2`))).toBe("4");
    expect(String(ceil(R`1/2:5/2`))).toBe("3");
    expect(String(floor(R`7/2`))).toBe("3");
    expect(String(floor(R`1/2:5/2`))).toBe("0");
    expect(String(pm(R`1`, R`1/10`).low)).toBe("9/10");
    expect(String(pm(R`1`, 0))).toBe("1");
    expect(() => bound({})).toThrow("expected an exact value");
    expect(() => bound(null)).toThrow("null");
  });

  test("results are normalised to exact values", () => {
    expect(normalise(5, R`1`)).toBeInstanceOf(Integer);
    expect(normalise(5n, R`1`).value).toBe(5n);
    expect(String(normalise("1/3", R`1`))).toBe("1/3");
    expect(normalise(R`4/2`, R`1`)).toBeInstanceOf(Integer);
    expect(String(normalise({ at: (x) => x.multiply(R`2`) }, R`3/2`))).toBe("3");
    expect(() => normalise(undefined, R`1`)).toThrow("returned nothing");
    expect(() => normalise(0.5, R`1`)).toThrow("inexact JavaScript number");
  });
});

describe("compiling and running JavaScript functions", () => {
  test("expressions return automatically; bodies need return", () => {
    const run = (code, x = R`1/2`) => buildFunctions([{ name: "F", code }], 3).call("F", x);
    expect(String(run("R`${x}^2`"))).toBe("1/4");
    expect(String(run("const y = x.add(R`1`);\nreturn y.multiply(y);"))).toBe("9/4");
    expect(String(run("d"))).toBe("3");
    expect(String(run("sum(1, 4, (n) => R`1/${n}`)"))).toBe("25/12");
    expect(String(run("range(1, 3).multiply(x).sum()"))).toBe("3");
    expect(String(run("lib.R`2`"))).toBe("2");
    expect(() => compile("   ")).toThrow("empty");
  });

  test("functions call each other and the expression box uses them", () => {
    const fns = buildFunctions([
      { name: "F", code: "R`${x}^2 - 2`" },
      { name: "G", code: "F(x).add(F())" },
      { name: "H", code: "expr(\"F(x + 1) + d\")" },
    ], 2);
    expect(String(fns.call("G", R`3/2`))).toBe("1/2");
    expect(String(fns.call("H", R`1`))).toBe("4");
    expect(String(fns.evaluate("F(G) + F", R`3/2`))).toBe(String(R`(1/2)^2 - 2 + 1/4`));
  });

  test("errors carry the function name and line", () => {
    const fns = buildFunctions([
      { name: "A", code: "const a = 1;\nconst b = 2;\nreturn a.nope();" },
      { name: "B", code: "x.nope()" },
      { name: "S", code: "return (;" },
      { name: "C", code: "C()" },
    ], 0);
    expect(describeError(capture(() => fns.call("A", R`1`)))).toMatch(/^A, line 3: /);
    expect(describeError(capture(() => fns.call("B", R`1`)))).toMatch(/^B, line 1: /);
    expect(describeError(capture(() => fns.call("S", R`1`)))).toContain("S");
    expect(describeError(capture(() => fns.call("C", R`1`)))).toContain("too deeply");
    expect(fns.errors.has("S")).toBe(true);
    expect(errorLine({ stack: "x" })).toBeNull();
    expect(errorLine({ lineNumber: 6 })).toBe(2);
    expect(describeError("plain")).toBe("plain");
  });

  test("network and worker messaging names are hidden from user code", () => {
    for (const name of BLOCKED_NAMES) {
      const result = buildFunctions([{ name: "F", code: `typeof ${name} === "undefined" ? 1 : 0` }], 0).call("F", R`1`);
      expect(String(result), name).toBe("1");
    }
  });

  test("libraries registered later appear by name and in lib, without changing existing code", () => {
    registerLibrary("demo", { double: (v) => v.multiply(R`2`) });
    const fns = buildFunctions([{ name: "F", code: "double(x).add(lib.demo.double(x))" }], 0);
    expect(String(fns.call("F", R`1/2`))).toBe("2");
  });

  test("version-1 Formula and Taylor definitions migrate to equivalent code", () => {
    const formula = migrateDefinition({ name: "F", kind: "formula", formula: "x^2 - 2" });
    const taylor = migrateDefinition({ name: "E", kind: "taylor", term: "x^n/n!", terms: "5*d", errorMode: "lagrange", bound: "3^CEIL(ABS(x))", order: "n+1", domain: "" });
    const fns = buildFunctions([formula, taylor], 3);
    expect(String(fns.call("F", R`3/2`))).toBe("1/4");
    expect(encloses(fns.call("E", R`1`), "2.718281828459045235360287471352")).toBe(true);
    expect(migrateDefinition({ name: "G", code: "1" })).toEqual({ name: "G", code: "1" });
  });
});

describe("predefined snippets", () => {
  test("each snippet encloses its 30-digit reference value", () => {
    const fns = buildFunctions(snippets, 3);
    const cases = [
      ["EXP", R`1`, "2.718281828459045235360287471352"],
      ["SIN", R`1/2`, "0.479425538604203000273287935215"],
      ["COS", R`1`, "0.540302305868139717400936607442"],
      ["LN1P", R`1/2`, "0.405465108108164381978013115464"],
      ["ATAN", R`1/2`, "0.463647609000806116214256231461"],
      ["GEOM", R`1/2`, "2"],
      ["SQRT1P", R`1/2`, "1.224744871391589049098642037352"],
    ];
    for (const [name, x, reference] of cases) expect(encloses(fns.call(name, x), reference), name).toBe(true);
    expect(String(fns.call("NEWTON", R`3/2`))).toBe("17/12");
    expect(String(fns.call("SQ", R`2/3`))).toBe("4/9");
    expect(String(fns.call("RECIP", R`2/3`))).toBe("3/2");
    expect(encloses(fns.call("EXP", R`0:1`), "2.718281828459045235360287471352")).toBe(true);
    expect(describeError(capture(() => fns.call("LN1P", R`2`)))).toBe("LN1P, line 3: LN1P needs |x| < 1");
    expect(describeError(capture(() => fns.call("ATAN", R`2`)))).toContain("ATAN needs |x| <= 1");
    expect(describeError(capture(() => fns.call("GEOM", R`1`)))).toContain("GEOM needs |x| < 1");
    expect(describeError(capture(() => fns.call("SQRT1P", R`-1`)))).toContain("SQRT1P needs |x| < 1");
  });
});

describe("worker requests (in-process)", () => {
  test("all, statuses, expression and test requests", async () => {
    const runner = new FunctionRunner({ inProcess: true });
    const all = await runner.request({ type: "all", definitions: snippets.slice(0, 2), expression: "EXP(SIN)", x: R`1/2`, d: 1 });
    expect(all.ok).toBe(true);
    expect(all.statuses.map(({ name, ok }) => [name, ok])).toEqual([["EXP", true], ["SIN", true]]);
    expect(all.expression.value).toBeInstanceOf(RationalInterval);
    const blank = await runner.request({ type: "all", definitions: [], expression: "", x: R`1`, d: 0 });
    expect(blank.expression).toBeNull();
    const bad = await runner.request({ type: "all", definitions: [], expression: "F", x: R`1`, d: 0 });
    expect(bad.expression.ok).toBe(false);
    const statuses = await runner.request({ type: "statuses", definitions: [{ name: "F", code: "x.nope()" }], x: R`1`, d: 0 });
    expect(statuses.statuses[0]).toMatchObject({ name: "F", ok: false, line: 1 });
    const expression = await runner.request({ type: "expression", definitions: [], expression: "x + 1", x: R`1:2`, d: 0 });
    expect(String(expression.value.high)).toBe("3");
    const tested = await runner.request({ type: "test", definitions: [{ name: "F", code: "1" }], name: "G", originalName: "F", code: "x", x: R`5`, d: 0 });
    expect(String(tested.value)).toBe("5");
    expect((await runner.request({ type: "nope", x: R`1` })).ok).toBe(false);
    expect((await runner.request({ type: "expression", definitions: [{ name: "F", code: "(" }], expression: "F", x: R`1`, d: 0 })).ok).toBe(false);
    runner.stop(); // nothing pending: no effect
  });

  test("summaries for the function list", () => {
    expect(summary("// e^x by Taylor\nreturn 1;")).toBe("e^x by Taylor");
    expect(summary("R`${x}^2`")).toBe("R`${x}^2`");
    expect(summary("")).toBe("");
  });
});

function capture(fn) {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("expected an error");
}
