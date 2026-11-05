import { describe, expect, test } from "bun:test";
import { Fraction, Rational } from "@ratmath/core";
import { describeExample, PLAYGROUND_SCOPE, runPlaygroundCode } from "../src/showcase.js";
import { evaluateAt, fractionFromInput } from "../src/stern-brocot-web.js";

const showcase = await Bun.file(new URL("../docs/showcase.html", import.meta.url)).text();
const unescape = (text) => text.replaceAll("&gt;", ">").replaceAll("&lt;", "<").replaceAll("&amp;", "&");

describe("showcase", () => {
  test("every example box's default text evaluates", () => {
    const boxes = [...showcase.matchAll(/id="(\w+)-expr" value="([^"]*)"/g)];
    expect(boxes.map(([, kind]) => kind)).toEqual(["basic", "repeating", "interval", "cf", "bases"]);
    for (const [, kind, value] of boxes) {
      const result = describeExample(kind, unescape(value));
      expect(result.ok, `${kind}: ${result.lines}`).toBe(true);
    }
    expect(describeExample("cf", "3.~7~15~1").lines.join("\n")).toContain(".convergents()                3, 22/7, 355/113");
    expect(describeExample("bases", "0xff.8").lines).toContain("bin  0b11111111.1");
    expect(describeExample("interval", "(1.4:1.6) * (2.9:3.1)").lines[1]).toContain("width 9/10");
    expect(describeExample("repeating", "1.2#34").lines[1]).toBe("period: 2 digits");
    expect(describeExample("basic", "x").ok).toBe(false);
  });

  test("the playground's default code runs and shows exact results", () => {
    const code = unescape(showcase.match(/<textarea id="playground-code" rows="\d+">([\s\S]*?)<\/textarea>/)[1]);
    const result = runPlaygroundCode(code);
    expect(result.ok).toBe(true);
    expect(result.lines).toContain("sum of squares 1..10: 385");
    expect(result.lines).toContain("convergents: [3, 22/7, 355/113]");
    expect(runPlaygroundCode("throw new Error('boom')").lines).toEqual(["Error: boom"]);
    expect(runPlaygroundCode("console.error(R`1/2`)").lines).toEqual(["Error: 1/2 = 0.5"]);
  });

  test("the playground scope is Core plus display helpers, without legacy parser names", () => {
    for (const name of ["R", "sum", "product", "seq", "range", "Rational", "parseNumber", "show", "hex", "bin", "inBase", "sci"]) {
      expect(PLAYGROUND_SCOPE).toHaveProperty(name);
    }
    expect(PLAYGROUND_SCOPE).not.toHaveProperty("Parser");
    expect(PLAYGROUND_SCOPE).not.toHaveProperty("default");
  });

  test("code samples on the page match Core's behaviour", () => {
    expect(runPlaygroundCode("console.log([R`0.1 + 0.2`.equals(R`0.3`), R`1:2 + 0.5:1.5`, R`5 + 1:2`, R`2..1/3`, R`3.~7~15~1`, R`2.5_^-2`, R`0xff.8`].map(String).join(' '))").lines[0])
      .toBe("true 3/2:7/2 6:7 7/3 355/113 1/40 511/2");
    expect(runPlaygroundCode("console.log(String(sum(1, 100, (i) => R`1/(${i}*(${i}+1))`)) + ' ' + R`5.2[+-0.05]`.multiply(R`2`))").lines[0])
      .toBe("100/101 1039/100:1041/100");
  });
});

describe("Stern-Brocot inputs use Core's R", () => {
  test("jump targets", () => {
    for (const [input, expected] of [["3/4", "3/4"], ["0.75", "3/4"], ["1..2/3", "5/3"], ["0.#3", "1/3"], ["3.~7~15", "333/106"], ["7", "7"]]) {
      const fraction = fractionFromInput(input);
      expect(fraction).toBeInstanceOf(Fraction);
      expect(`${fraction.numerator}/${fraction.denominator}`.replace(/\/1$/, "")).toBe(expected);
    }
    expect(() => fractionFromInput("1:2")).toThrow("single exact number");
  });

  test("expressions in x are exact", () => {
    const x = new Rational(3, 2);
    expect(String(evaluateAt("x^2", x))).toBe("9/4");
    expect(String(evaluateAt("5*x - 3", x))).toBe("9/2");
    expect(String(evaluateAt("x^3 - 2*x + 1/x", x))).toBe("25/24");
    expect(String(evaluateAt("7", x))).toBe("7");
  });
});
