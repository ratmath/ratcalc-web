/**
 * RatTree's named-function panel: add, edit, rename and remove functions that
 * the expression box can call (see named-functions.js for the semantics).
 * Definitions persist in localStorage when it is available.
 */
import { PRESETS, applyFunction, nameProblem, nextName, termCount } from "./named-functions.js";

const STORAGE_KEY = "ratree.functions.v1";
const FIELDS = ["formula", "term", "terms", "error", "domain", "errorMode", "bound", "order"];

function plainDefinition(definition) {
  const { name, kind, note } = definition;
  const result = { name, kind, note: note ?? "" };
  for (const field of FIELDS) if (definition[field] !== undefined) result[field] = String(definition[field]);
  return result;
}

/** Load saved definitions, ignoring anything malformed or unavailable. */
export function loadDefinitions(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const names = [];
    return parsed.filter((item) => {
      if (!item || (item.kind !== "formula" && item.kind !== "taylor") || nameProblem(item.name, names)) return false;
      names.push(item.name);
      return true;
    }).map(plainDefinition);
  } catch {
    return [];
  }
}

export function saveDefinitions(storage, definitions) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(definitions.map(plainDefinition)));
  } catch {
    // Private windows and blocked storage: the panel still works for this visit.
  }
}

export class FunctionsPanel {
  /**
   * @param root element to render into
   * @param options.context () => { vars: { x, d }, functions } at the current node
   * @param options.show (element, value) => render a value (short text, click for more)
   * @param options.onChange called after any definition changes
   */
  constructor(root, { context, show = (element, value) => { element.textContent = String(value); }, onChange = () => {}, storage = globalThis.localStorage } = {}) {
    this.root = root;
    this.context = context;
    this.show = show;
    this.onChange = onChange;
    this.storage = storage;
    this.definitions = loadDefinitions(storage);
    this.render();
  }

  /** Name -> definition, for the evaluator. */
  map() {
    return new Map(this.definitions.map((definition) => [definition.name, definition]));
  }

  names() {
    return this.definitions.map(({ name }) => name);
  }

  add(kind, preset = null) {
    const name = nextName(this.names(), preset?.name);
    const definition = preset
      ? { ...plainDefinition(preset), name }
      : kind === "formula"
        ? { name, kind, formula: "x^2", note: "" }
        : { name, kind, term: "x^n/n!", terms: "10", error: "", domain: "", note: "" };
    this.definitions.push(definition);
    this.changed();
    return definition;
  }

  remove(name) {
    this.definitions = this.definitions.filter((definition) => definition.name !== name);
    this.changed();
  }

  /** Rename; returns an error message, or null when renamed. */
  rename(oldName, newName) {
    const name = newName.trim().toUpperCase();
    if (name === oldName) return null;
    const problem = nameProblem(name, this.names().filter((other) => other !== oldName));
    if (problem) return problem;
    this.definitions.find((definition) => definition.name === oldName).name = name;
    this.changed();
    return null;
  }

  update(name, field, value) {
    const definition = this.definitions.find((item) => item.name === name);
    definition[field] = value;
    if (field === "kind") {
      if (value === "formula" && definition.formula === undefined) definition.formula = "x";
      if (value === "taylor" && definition.term === undefined) Object.assign(definition, { term: "x^n/n!", terms: "10", error: "", domain: "" });
    }
    if (field === "errorMode" && value === "lagrange" && definition.bound === undefined) Object.assign(definition, { bound: "1", order: "n+1" });
    this.changed(field === "kind" || field === "errorMode");
  }

  changed(rerender = true) {
    saveDefinitions(this.storage, this.definitions);
    if (rerender) this.render();
    else this.refresh();
    this.onChange();
  }

  /** Status for one definition at the current node: { ok, prefix, value } or { ok: false, text }. */
  status(definition) {
    try {
      const context = { ...this.context(), functions: this.map() };
      const prefix = definition.kind === "taylor" ? `N = ${termCount(definition, context)} at depth ${context.vars.d} · ` : "";
      const value = applyFunction(definition, context.vars.x, { ...context, name: definition.name });
      return { ok: true, prefix: `${prefix}${definition.name}(x) = `, value };
    } catch (error) {
      return { ok: false, text: error.message };
    }
  }

  /** Update every status line (after navigation or an edit). */
  refresh() {
    for (const card of this.root.querySelectorAll(".fn-card")) {
      const definition = this.definitions.find((item) => item.name === card.dataset.name);
      const line = card.querySelector(".fn-status");
      if (!definition || !line) continue;
      const status = this.status(definition);
      line.classList.toggle("fn-error", !status.ok);
      if (!status.ok) {
        line.textContent = status.text;
        continue;
      }
      const valueSpan = this.element("span", "fn-value");
      line.replaceChildren(status.prefix, valueSpan);
      this.show(valueSpan, status.value);
    }
  }

  element(tag, className, text) {
    const node = this.root.ownerDocument.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  field(definition, field, label, placeholder) {
    const row = this.element("label", "fn-field");
    row.append(this.element("span", "fn-label", label));
    const input = this.element("input", `fn-input fn-${field}`);
    input.type = "text";
    input.value = definition[field] ?? "";
    input.placeholder = placeholder;
    input.spellcheck = false;
    input.addEventListener("input", () => this.update(definition.name, field, input.value));
    row.append(input);
    return row;
  }

  card(definition) {
    const card = this.element("div", "fn-card");
    card.dataset.name = definition.name;
    const head = this.element("div", "fn-head");
    const name = this.element("input", "fn-name");
    name.value = definition.name;
    name.title = "Function name: capital letters and digits";
    name.addEventListener("change", () => {
      const problem = this.rename(definition.name, name.value);
      if (problem) {
        name.value = definition.name;
        card.querySelector(".fn-status").textContent = problem;
        card.querySelector(".fn-status").classList.add("fn-error");
      }
    });
    head.append(name);
    const kinds = this.element("div", "fn-kinds");
    for (const [kind, label] of [["formula", "Formula"], ["taylor", "Taylor"]]) {
      const button = this.element("button", `fn-kind${definition.kind === kind ? " active" : ""}`, label);
      button.type = "button";
      button.addEventListener("click", () => { if (definition.kind !== kind) this.update(definition.name, "kind", kind); });
      kinds.append(button);
    }
    head.append(kinds);
    const remove = this.element("button", "fn-remove", "×");
    remove.type = "button";
    remove.title = `Remove ${definition.name}`;
    remove.addEventListener("click", () => this.remove(definition.name));
    head.append(remove);
    card.append(head);

    if (definition.kind === "formula") {
      card.append(this.field(definition, "formula", `${definition.name}(x) =`, "x^2 - 2"));
    } else {
      card.append(this.field(definition, "term", "term(x, n) =", "x^n/n!"));
      card.append(this.field(definition, "terms", "N =", "10 or 5*d"));
      const modes = this.element("div", "fn-kinds fn-modes");
      for (const [mode, label] of [["explicit", "Error formula"], ["lagrange", "Lagrange"]]) {
        const active = (definition.errorMode ?? "explicit") === mode;
        const button = this.element("button", `fn-kind${active ? " active" : ""}`, label);
        button.type = "button";
        button.title = mode === "lagrange" ? "Remainder ≤ M·|x|^k/k! with M bounding |f^(k)| between 0 and x" : "Write the remainder bound directly";
        button.addEventListener("click", () => { if (!active) this.update(definition.name, "errorMode", mode); });
        modes.append(button);
      }
      card.append(modes);
      if (definition.errorMode === "lagrange") {
        card.append(this.field(definition, "bound", "|f^(k)| ≤ M(x, n) =", "e.g. 1 or 3^CEIL(ABS(x))"));
        card.append(this.field(definition, "order", "k =", "n+1"));
      } else {
        card.append(this.field(definition, "error", "error(x, n=N) =", "bound on the remainder (blank: none)"));
      }
      card.append(this.field(definition, "domain", "domain", "all x, or an interval like -1:1"));
    }
    if (definition.note) card.append(this.element("div", "fn-note", definition.note));
    card.append(this.element("div", "fn-status"));
    return card;
  }

  render() {
    this.root.replaceChildren();
    const tools = this.element("div", "fn-tools");
    for (const [kind, label] of [["formula", "+ Formula"], ["taylor", "+ Taylor"]]) {
      const button = this.element("button", "fn-add", label);
      button.type = "button";
      button.addEventListener("click", () => this.add(kind));
      tools.append(button);
    }
    const presets = this.element("select", "fn-presets");
    presets.title = "Add a predefined function";
    presets.append(Object.assign(this.element("option", "", "Predefined…"), { value: "" }));
    for (const preset of PRESETS) presets.append(Object.assign(this.element("option", "", `${preset.label} (${preset.note})`), { value: preset.name }));
    presets.addEventListener("change", () => {
      const preset = PRESETS.find(({ name }) => name === presets.value);
      presets.value = "";
      if (preset) this.add(preset.kind, preset);
    });
    tools.append(presets);
    this.root.append(tools);
    if (this.definitions.length === 0) {
      this.root.append(this.element("p", "fn-empty", "No functions yet. In the expression box, F means F(x) at the current node and F(expr) applies F to expr."));
    }
    for (const definition of this.definitions) this.root.append(this.card(definition));
    this.refresh();
  }
}
