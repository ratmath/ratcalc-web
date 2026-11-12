/**
 * RatTree's function panel: a list of named JavaScript functions with their
 * values at the current node, an editor dialog (name, code, Test, Save), and
 * predefined snippets. Code runs in a worker (ratree-worker.js); see
 * ratree-scope.js for what is in scope. Definitions persist in localStorage.
 */
import { ANALYTIC_SNIPPETS, SNIPPETS, migrateDefinition } from "./ratree-scope.js";
import { nameProblem, nextName } from "./named-functions.js";

export const STORAGE_KEY = "ratree.functions.v2";
const LEGACY_KEY = "ratree.functions.v1";

/** Saved { name, code } definitions; version-1 Formula/Taylor ones are migrated. */
export function loadDefinitions(storage) {
  const read = (key) => {
    try {
      const parsed = JSON.parse(storage?.getItem(key) ?? "null");
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };
  const current = read(STORAGE_KEY);
  const source = current ?? (read(LEGACY_KEY) ?? []).map((item) => (item ? migrateDefinition(item) : null));
  const names = [];
  return source.filter((item) => {
    if (!item || typeof item.code !== "string" || nameProblem(item.name, names)) return false;
    names.push(item.name);
    return true;
  }).map(({ name, code }) => ({ name, code }));
}

export function saveDefinitions(storage, definitions) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(definitions.map(({ name, code }) => ({ name, code }))));
  } catch {
    // Storage blocked: definitions last for this visit only.
  }
}

/** First line worth showing as a summary: a comment, or the code itself. */
export function summary(code) {
  const lines = String(code).split("\n").map((line) => line.trim()).filter(Boolean);
  const comment = lines.find((line) => line.startsWith("//"));
  return (comment ? comment.replace(/^\/\/\s*/, "") : lines[0] ?? "").slice(0, 80);
}

export class FunctionsPanel {
  /**
   * @param root list container
   * @param options.dialog { modal, name, code, message, test, save, cancel, stop, close, title }
   * @param options.runner FunctionRunner (worker)
   * @param options.context () => { x, d } at the current node
   * @param options.show (element, value) => render a value
   * @param options.onChange called after definitions change
   */
  constructor(root, { dialog, runner, context, show, onChange = () => {}, storage = globalThis.localStorage }) {
    this.root = root;
    this.dialog = dialog;
    this.runner = runner;
    this.context = context;
    this.show = show;
    this.onChange = onChange;
    this.storage = storage;
    this.definitions = loadDefinitions(storage);
    this.statuses = new Map();
    this.editing = null;
    this.bindDialog();
    this.render();
  }

  names() {
    return this.definitions.map(({ name }) => name);
  }

  // --- editor dialog ---------------------------------------------------------

  bindDialog() {
    const { modal, test, save, cancel, close, stop, code } = this.dialog;
    test.addEventListener("click", () => this.testEdit());
    save.addEventListener("click", () => this.saveEdit());
    cancel.addEventListener("click", () => this.closeEditor());
    close?.addEventListener("click", () => this.closeEditor());
    stop.addEventListener("click", () => this.runner.stop());
    modal.addEventListener("click", (event) => { if (event.target === modal) this.closeEditor(); });
    code.addEventListener("keydown", (event) => {
      if (event.key === "Tab") {
        event.preventDefault();
        const { selectionStart: start, selectionEnd: end, value } = code;
        code.value = `${value.slice(0, start)}  ${value.slice(end)}`;
        code.selectionStart = code.selectionEnd = start + 2;
      } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        this.testEdit();
      } else if (event.key === "Escape") {
        this.closeEditor();
      }
    });
  }

  /** Open the editor for an existing function, a snippet, or a blank one. */
  openEditor({ name = null, code = "", preferredName = null } = {}) {
    this.editing = name;
    const { modal, title } = this.dialog;
    this.dialog.name.value = name ?? nextName(this.names(), preferredName ?? undefined);
    this.dialog.code.value = code;
    title.textContent = name ? `Edit ${name}` : "New function";
    this.setMessage("Ctrl/Cmd+Enter tests the code at the current node.", "info");
    modal.style.display = "block";
    this.dialog.code.focus();
  }

  closeEditor() {
    this.runner.stop();
    this.dialog.modal.style.display = "none";
    this.editing = null;
  }

  setMessage(text, kind) {
    const { message } = this.dialog;
    message.textContent = text;
    message.className = `fn-message fn-message-${kind}`;
  }

  editedName() {
    return this.dialog.name.value.trim().toUpperCase();
  }

  checkName() {
    const name = this.editedName();
    const others = this.names().filter((other) => other !== this.editing);
    return nameProblem(name, others);
  }

  async testEdit() {
    try {
      await this.runTest();
    } catch (error) {
      this.dialog.stop.hidden = true;
      this.setMessage(error?.message ?? String(error), "error");
    }
  }

  async runTest() {
    const problem = this.checkName();
    if (problem) return this.setMessage(problem, "error");
    this.setMessage("Computing…", "busy");
    this.dialog.stop.hidden = false;
    const { x, d } = this.context();
    const result = await this.runner.request({
      type: "test", definitions: this.definitions, name: this.editedName(), originalName: this.editing,
      code: this.dialog.code.value, x, d,
    });
    this.dialog.stop.hidden = true;
    if (result.superseded) return;
    if (!result.ok) return this.setMessage(result.error, "error");
    this.setMessage("", "ok");
    const label = this.dialog.message.ownerDocument.createElement("span");
    label.textContent = `${this.editedName()}(${x}) at depth ${d} = `;
    const value = this.dialog.message.ownerDocument.createElement("span");
    this.dialog.message.replaceChildren(label, value);
    this.show(value, result.value);
  }

  saveEdit() {
    const problem = this.checkName();
    if (problem) return this.setMessage(problem, "error");
    if (!this.dialog.code.value.trim()) return this.setMessage("The code is empty", "error");
    const definition = { name: this.editedName(), code: this.dialog.code.value };
    const index = this.definitions.findIndex(({ name }) => name === this.editing);
    if (index >= 0) this.definitions[index] = definition;
    else this.definitions.push(definition);
    this.closeEditor();
    this.changed();
  }

  remove(name) {
    this.definitions = this.definitions.filter((definition) => definition.name !== name);
    this.changed();
  }

  changed() {
    saveDefinitions(this.storage, this.definitions);
    this.render();
    this.onChange();
  }

  // --- list ------------------------------------------------------------------

  element(tag, className, text) {
    const node = this.root.ownerDocument.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /** Show statuses from the worker: [{ name, ok, value | error }]. */
  setStatuses(statuses) {
    this.statuses = new Map((statuses ?? []).map((status) => [status.name, status]));
    for (const row of this.root.querySelectorAll(".fn-row")) {
      const line = row.querySelector(".fn-status");
      const status = this.statuses.get(row.dataset.name);
      line.classList.toggle("fn-error", Boolean(status && !status.ok));
      if (!status) {
        line.textContent = "…";
      } else if (!status.ok) {
        line.textContent = status.error;
      } else {
        const value = this.element("span", "fn-value");
        line.replaceChildren(`${row.dataset.name}(x) = `, value);
        this.show(value, status.value);
      }
    }
  }

  render() {
    this.root.replaceChildren();
    const tools = this.element("div", "fn-tools");
    const add = this.element("button", "fn-add", "+ Add function");
    add.type = "button";
    add.addEventListener("click", () => this.openEditor({ code: "// x is the node's value, d its depth\nreturn R`${x}^2 - 2`;" }));
    tools.append(add);
    const presets = this.element("select", "fn-presets");
    presets.title = "Start from a predefined function";
    presets.append(Object.assign(this.element("option", "", "Predefined…"), { value: "" }));
    for (const [label, snippets] of [["Series with error bounds", SNIPPETS], ["Certified (@ratmath/analytic)", ANALYTIC_SNIPPETS]]) {
      const group = this.element("optgroup");
      group.label = label;
      for (const snippet of snippets) group.append(Object.assign(this.element("option", "", snippet.label), { value: snippet.name }));
      presets.append(group);
    }
    presets.addEventListener("change", () => {
      const snippet = [...SNIPPETS, ...ANALYTIC_SNIPPETS].find(({ name }) => name === presets.value);
      presets.value = "";
      if (snippet) this.openEditor({ code: snippet.code, preferredName: snippet.name });
    });
    tools.append(presets);
    this.root.append(tools);
    if (this.definitions.length === 0) {
      this.root.append(this.element("p", "fn-empty", "No functions yet. Each is a little JavaScript with x (the node) and d (its depth). In the expression box, F means F(x) and F(expr) applies F to expr."));
    }
    for (const definition of this.definitions) {
      const row = this.element("div", "fn-row");
      row.dataset.name = definition.name;
      const head = this.element("div", "fn-head");
      head.append(this.element("strong", "fn-title", definition.name));
      head.append(this.element("span", "fn-summary", summary(definition.code)));
      const edit = this.element("button", "fn-edit", "Edit");
      edit.type = "button";
      edit.addEventListener("click", () => this.openEditor({ name: definition.name, code: definition.code }));
      const remove = this.element("button", "fn-remove", "×");
      remove.type = "button";
      remove.title = `Remove ${definition.name}`;
      remove.addEventListener("click", () => this.remove(definition.name));
      head.append(edit, remove);
      row.append(head, this.element("div", "fn-status", "…"));
      this.root.append(row);
    }
    this.setStatuses([...this.statuses.values()]);
  }
}
