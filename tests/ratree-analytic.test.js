import { describe, expect, test } from "bun:test";
import { R, RationalInterval } from "@ratmath/core";
import { ANALYTIC, ANALYTIC_SNIPPETS, SNIPPETS, buildFunctions } from "../src/ratree-scope.js";
import { handleRequest, revive } from "../src/ratree-runtime.js";

const statuses = (definitions, x, d = 0) =>
  handleRequest(JSON.parse(JSON.stringify({ type: "statuses", definitions, x, d }))).statuses;
const one = (code, x, d = 0) => buildFunctions([{ name: "F", code }], d).call("F", x);

describe("@ratmath/analytic in RatTree functions", () => {
  test("certified functions are in scope by name and as analytic", () => {
    const v = one("exp(x)", R`1/3`);
    expect(v).toBeInstanceOf(RationalInterval);
    expect(v.high.subtract(v.low).lessThan(R`1/10^30`)).toBe(true);
    expect(String(one("analytic.exp(x)", R`1/3`))).toBe(String(v));
    const pi = one("pi", R`0`);
    expect(pi.low.lessThanOrEqual(R`3.141592653589793238462643383279502884197169399375105820974944593`)).toBe(true);
    expect(pi.high.greaterThanOrEqual(R`3.141592653589793238462643383279502884197169399375105820974944592`)).toBe(true);
  });

  test("Core's range and the pow helper keep their meaning; analytic.range is the enclosure", () => {
    expect(String(one("range(1, 3).sum()", R`0`))).toBe("6");
    expect(String(one("pow(x, 0)", R`0`))).toBe("1");
    const r = one("analytic.range((t) => t.multiply(cos(t)), R`0:3`)", R`0`);
    expect(r.low.lessThan(R`-2.96`) && r.high.greaterThan(R`0.56`)).toBe(true);
  });

  test("a returned Taylor model is evaluated at x", () => {
    const v = one("model((t) => exp(sin(t)), R`0:1`)", R`1/3`);
    expect(v.low.lessThan(R`1.38708`) && v.high.greaterThan(R`1.38707`)).toBe(true);
    expect(() => one("model((t) => exp(t), R`0:1`)", R`2`)).toThrow("outside the model's domain");
  });

  test("user code may declare names that are also in scope", () => {
    expect(String(one("const e = 3; let range = 2; const exp = 1; return R`${e} + ${range} + ${exp}`;", R`0`))).toBe("6");
  });

  test("every analytic snippet runs where its domain allows", () => {
    const definitions = ANALYTIC_SNIPPETS.map(({ name, code }) => ({ name, code }));
    for (const status of statuses(definitions, R`1/2`, 2)) expect(status.ok, `${status.name}: ${status.error}`).toBe(true);
    const at = Object.fromEntries(statuses(definitions, R`1/2`, 2).map((s) => [s.name, revive(s.value)]));
    expect(at.GSERIES.containsValue(R`4/3`)).toBe(true);
    expect(at.ERFI.low.lessThan(R`0.4613`) && at.ERFI.high.greaterThan(R`0.4612`)).toBe(true);
    const outside = Object.fromEntries(statuses(definitions, R`2`, 0).map((s) => [s.name, s]));
    expect(outside.EMODEL.ok).toBe(false);
    expect(outside.CEXP.ok && outside.ERFI.ok).toBe(true);
  });

  test("snippet names are distinct from the series snippets", () => {
    const names = [...SNIPPETS, ...ANALYTIC_SNIPPETS].map(({ name }) => name);
    expect(new Set(names).size).toBe(names.length);
    expect(Object.isFrozen(ANALYTIC)).toBe(true);
  });

  test("the EXP snippet uses depth as a number", () => {
    expect(SNIPPETS.find(({ name }) => name === "EXP").code).toContain("12 + Number(d)");
  });
});
