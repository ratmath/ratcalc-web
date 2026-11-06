import { beforeEach, describe, expect, test } from "bun:test";
import { Rational, RationalInterval } from "@ratmath/core";

// A minimal DOM: enough elements, events and classes for WebCalculator.
class FakeElement {
  constructor(tag = "div", attributes = {}) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.listeners = {};
    this.style = {};
    this.dataset = { ...attributes.dataset };
    this.className = attributes.className ?? "";
    this.value = "";
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.textContent = attributes.text ?? "";
    this._html = "";
    const classes = () => new Set(this.className.split(/\s+/).filter(Boolean));
    this.classList = {
      add: (name) => { const set = classes(); set.add(name); this.className = [...set].join(" "); },
      remove: (name) => { const set = classes(); set.delete(name); this.className = [...set].join(" "); },
      contains: (name) => classes().has(name),
    };
  }
  set innerHTML(html) {
    this._html = html;
    this.children = [];
    if (html.includes('class="input-text"')) this.children.push(new FakeElement("span", { className: "input-text" }));
    if (html.includes('class="mobile-text"')) this.children.push(new FakeElement("span", { className: "mobile-text" }));
  }
  get innerHTML() { return this._html; }
  appendChild(child) { this.children.push(child); return child; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = [...children]; }
  addEventListener(type, handler) { (this.listeners[type] ??= []).push(handler); }
  dispatch(type, event = {}) {
    for (const handler of this.listeners[type] ?? []) handler({ preventDefault() {}, stopPropagation() {}, target: this, ...event });
  }
  click() { this.dispatch("click"); }
  focus() {}
  setAttribute(name, value) { this[name] = value; }
  setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
  querySelector(selector) {
    const name = selector.replace(/^\./, "");
    for (const child of this.children) {
      if (child.classList.contains(name)) return child;
      const nested = child.querySelector(selector);
      if (nested) return nested;
    }
    return null;
  }
  get allText() { return [this.textContent, ...this.children.map((child) => child.allText)].join(""); }
}

function fakePage() {
  const ids = ["calculatorInput", "outputHistory", "helpModal", "mobileKeypad", "mobileInputDisplay", "commandPanel",
    "copyButton", "helpButton", "clearButton", "closeHelp", "closeCommandPanel", "visualizationModal",
    "visualizationContainer", "closeVisualization", "exportSVGBtn", "exportHTMLBtn", "saveComputationBtn", "stepSizeInput",
    "draftsBar", "draftsToggle", "draftsList", "clearInput"];
  const byId = Object.fromEntries(ids.map((id) => [id, new FakeElement()]));
  const keys = ["R`", "1", "/", "3", "`"].map((key) => new FakeElement("button", { className: "keypad-btn", dataset: { key } }));
  const enter = new FakeElement("button", { className: "keypad-btn", dataset: { action: "enter" } });
  const command = new FakeElement("button", { className: "command-btn", dataset: { command: "vars()" } });
  const root = new FakeElement("document");
  root.getElementById = (id) => byId[id];
  root.querySelectorAll = (selector) => {
    if (selector === ".keypad-btn[data-key]") return keys;
    if (selector === ".keypad-btn[data-action]") return [enter];
    if (selector === ".command-btn") return [command];
    return [];
  };
  return { root, byId, keys, enter, command };
}

globalThis.window = { innerWidth: 1200 };
globalThis.document = { createElement: (tag) => new FakeElement(tag), body: new FakeElement("body") };
globalThis.requestAnimationFrame = (callback) => callback();
const { WebCalculator, MAX_DRAFTS, loadDrafts, saveDrafts } = await import("../src/web-calc.js");

const lastOutput = (page) => page.byId.outputHistory.children.at(-1).children[1];

describe("WebCalculator over the shared JavaScript session", () => {
  let page;
  let calc;
  beforeEach(() => {
    page = fakePage();
    const store = new Map();
    page.storage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
    calc = new WebCalculator(page.root, page.storage);
  });

  test("runs JavaScript with R and shows exact results", () => {
    expect(calc.run("R`1:2 + 3`").text).toBe("4:5");
    expect(lastOutput(page).className).toBe("output-line");
    expect(lastOutput(page).textContent).toBe("4:5");
    calc.run("let x = R`1/3`");
    expect(calc.run("R`${x} * 3`").text).toBe("1");
    expect(calc.transcript.at(-1)).toBe("> R`${x} * 3`\n1");
  });

  test("errors render as error lines; help works as a word", () => {
    calc.run("R`1/0`");
    expect(lastOutput(page).className).toBe("error-line");
    expect(calc.run("help").text).toContain("R`1:2 + 3`");
    expect(calc.run("fetch").text).toContain("not available in RatCalc");
  });

  test("Enter submits the input and arrows walk history", () => {
    page.byId.calculatorInput.value = "R`2/4`";
    page.byId.calculatorInput.dispatch("keydown", { key: "Enter" });
    expect(lastOutput(page).textContent).toBe("1/2 = 0.5");
    expect(page.byId.calculatorInput.value).toBe("");
    page.byId.calculatorInput.dispatch("keydown", { key: "ArrowUp" });
    expect(page.byId.calculatorInput.value).toBe("R`2/4`");
    page.byId.calculatorInput.dispatch("keydown", { key: "ArrowDown" });
    expect(page.byId.calculatorInput.value).toBe("");
  });

  test("keypad keys insert text and command buttons run commands", () => {
    for (const key of page.keys) key.click();
    expect(page.byId.calculatorInput.value).toBe("R`1/3`");
    page.enter.click();
    expect(lastOutput(page).textContent).toBe("1/3 = 0.#3");
    page.command.click();
    expect(lastOutput(page).textContent).toBe("(no variables)");
  });

  test("clear() resets variables and the visible history", () => {
    calc.run("let y = R`5`");
    calc.run("clear()");
    expect(calc.transcript).toEqual([]);
    expect(calc.run("vars()").text).toBe("(no variables)");
  });

  test("results reinsert as R expressions", () => {
    expect(calc.injection(new Rational(2, 3))).toBe("R`2/3`");
    expect(calc.injection(new RationalInterval(new Rational(1), new Rational(3, 2)))).toBe("R`1:3/2`");
    expect(calc.injection([1, 2])).toBe("ans");
  });

  test("recalling an earlier line sets typed input aside as a draft", () => {
    calc.run("R`1/2`");
    page.byId.calculatorInput.value = "R`3/4` + ";
    page.byId.outputHistory.children.at(-1).children[0].click();
    expect(page.byId.calculatorInput.value).toBe("R`1/2`");
    expect(calc.drafts).toEqual(["R`3/4` +"]);
    expect(page.byId.draftsBar.hidden).toBe(false);
    expect(page.byId.draftsToggle.textContent).toBe("Drafts (1)");
    page.byId.draftsList.children[0].children[0].click(); // restore swaps with the current input
    expect(page.byId.calculatorInput.value).toBe("R`3/4` +");
    expect(calc.drafts).toEqual(["R`1/2`"]);
    page.byId.draftsList.children[0].children[1].click(); // discard
    expect(calc.drafts).toEqual([]);
    expect(page.byId.draftsBar.hidden).toBe(true);
  });

  test("the clear button keeps the text, drafts are deduplicated, capped and saved", () => {
    page.byId.calculatorInput.value = "R`1/3`";
    page.byId.clearInput.click();
    expect(page.byId.calculatorInput.value).toBe("");
    page.byId.calculatorInput.value = "R`1/3`";
    page.byId.clearInput.click();
    expect(calc.drafts).toEqual(["R`1/3`"]);
    page.byId.clearInput.click(); // empty input adds nothing
    expect(calc.drafts).toEqual(["R`1/3`"]);
    for (let i = 0; i < MAX_DRAFTS + 5; i++) calc.setAside(`R\`${i}\``);
    expect(calc.drafts.length).toBe(MAX_DRAFTS);
    expect(loadDrafts(page.storage)).toEqual(calc.drafts);
    page.byId.draftsList.hidden = true; // as in calc.html
    page.byId.draftsToggle.click();
    expect(page.byId.draftsList.hidden).toBe(false);
  });

  test("draft storage tolerates bad data", () => {
    const store = new Map([["ratcalc.drafts.v1", "{nope"]]);
    const storage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
    expect(loadDrafts(storage)).toEqual([]);
    store.set("ratcalc.drafts.v1", JSON.stringify(["a", "a", 3, " ", "b"]));
    expect(loadDrafts(storage)).toEqual(["a", "b"]);
    expect(loadDrafts(undefined)).toEqual([]);
    expect(() => saveDrafts({ setItem() { throw new Error("blocked"); } }, ["a"])).not.toThrow();
  });
});
