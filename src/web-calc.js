/**
 * RatCalc (web): a JavaScript REPL with RatMath Core exact arithmetic.
 *
 * The page is a thin view over the shared calculator session
 * (apps/calc/src/session.js): input is JavaScript with Core and the R tag in
 * scope, and Core results display exactly. calc.html adds a
 * Content-Security-Policy that blocks network access and remote imports.
 */
import { RationalInterval } from "@ratmath/core";
import { createSession, HELP_TEXT } from "ratcalc/session";
import { IntervalVisualization } from "./IntervalVisualization.js";

const DRAFTS_KEY = "ratcalc.drafts.v1";
export const MAX_DRAFTS = 20;

/** Saved drafts (strings), or [] when storage is missing or unreadable. */
export function loadDrafts(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(DRAFTS_KEY) ?? "[]");
    return Array.isArray(parsed) ? [...new Set(parsed.filter((item) => typeof item === "string" && item.trim()))].slice(0, MAX_DRAFTS) : [];
  } catch {
    return [];
  }
}

export function saveDrafts(storage, drafts) {
  try {
    storage?.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch {
    // Storage blocked: drafts last for this visit only.
  }
}

export class WebCalculator {
  constructor(root = document, storage = globalThis.localStorage) {
    this.root = root;
    this.history = [];
    this.historyIndex = -1;
    this.transcript = [];
    this.mobileInput = "";
    this.visualization = null;
    this.session = createSession({ onClear: () => this.clearOutput() });
    this.drafts = loadDrafts(storage);
    this.storage = storage;
    this.elements();
    this.listen();
    this.displayWelcome();
    this.renderDrafts();
  }

  $(id) {
    return this.root.getElementById(id);
  }

  elements() {
    this.input = this.$("calculatorInput");
    this.output = this.$("outputHistory");
    this.helpModal = this.$("helpModal");
    this.keypad = this.$("mobileKeypad");
    this.mobileDisplay = this.$("mobileInputDisplay");
    this.commandPanel = this.$("commandPanel");
    this.copyButton = this.$("copyButton");
    this.visualizationModal = this.$("visualizationModal");
    this.visualizationContainer = this.$("visualizationContainer");
    this.stepSizeInput = this.$("stepSizeInput");
    this.saveButton = this.$("saveComputationBtn");
    this.draftsBar = this.$("draftsBar");
    this.draftsToggle = this.$("draftsToggle");
    this.draftsList = this.$("draftsList");
  }

  listen() {
    this.input.addEventListener("keydown", (event) => this.handleKeyDown(event));
    this.$("clearInput")?.addEventListener("click", () => this.clearInput());
    this.draftsToggle?.addEventListener("click", () => {
      if (this.draftsList) this.draftsList.hidden = !this.draftsList.hidden;
    });
    this.copyButton.addEventListener("click", () => this.copySession());
    this.$("helpButton").addEventListener("click", () => this.showHelp());
    this.$("clearButton").addEventListener("click", () => this.run("clear()"));
    this.$("closeHelp").addEventListener("click", () => this.hideModal(this.helpModal));
    this.$("closeVisualization").addEventListener("click", () => this.hideVisualization());
    this.$("exportSVGBtn").addEventListener("click", () => this.download("interval.svg", "image/svg+xml", this.visualization?.exportSVG()));
    this.$("exportHTMLBtn").addEventListener("click", () => this.download("interval.html", "text/html", this.visualization?.exportHTML?.()));
    this.saveButton.addEventListener("click", () => this.saveVisualization());
    this.stepSizeInput.addEventListener("input", () => this.updateStepSize());
    for (const modal of [this.helpModal, this.visualizationModal]) {
      modal.addEventListener("click", (event) => { if (event.target === modal) this.hideModal(modal); });
    }
    this.root.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.hideModal(this.helpModal);
        this.hideVisualization();
      }
    });
    this.setupKeypad();
    if (!this.isMobile()) setTimeout(() => this.input.focus(), 100);
  }

  isMobile() {
    return typeof window !== "undefined" && window.innerWidth <= 768;
  }

  handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      this.submit();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      this.navigateHistory(-1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      this.navigateHistory(1);
    }
  }

  navigateHistory(direction) {
    if (this.history.length === 0) return;
    if (direction < 0) this.historyIndex = this.historyIndex === -1 ? this.history.length - 1 : Math.max(0, this.historyIndex - 1);
    else if (this.historyIndex === -1) return;
    else if (this.historyIndex < this.history.length - 1) this.historyIndex += 1;
    else { this.historyIndex = -1; this.setInput(""); return; }
    this.setInput(this.history[this.historyIndex]);
  }

  /** Put an earlier line in the input; anything typed there moves to Drafts. */
  recall(source) {
    this.setAside(this.currentInput());
    this.setInput(source);
  }

  /** Clear the input, keeping its text in Drafts. */
  clearInput() {
    this.setAside(this.currentInput());
    this.setInput("");
  }

  setAside(text) {
    const draft = String(text ?? "").trim();
    if (!draft) return;
    this.drafts = [draft, ...this.drafts.filter((item) => item !== draft)].slice(0, MAX_DRAFTS);
    saveDrafts(this.storage, this.drafts);
    this.renderDrafts();
  }

  /** Bring a draft back; the current input (if any) takes its place in Drafts. */
  restoreDraft(draft) {
    this.drafts = this.drafts.filter((item) => item !== draft);
    const current = this.currentInput().trim();
    if (current && current !== draft) this.drafts.unshift(current);
    saveDrafts(this.storage, this.drafts);
    this.renderDrafts();
    this.setInput(draft);
  }

  removeDraft(draft) {
    this.drafts = this.drafts.filter((item) => item !== draft);
    saveDrafts(this.storage, this.drafts);
    this.renderDrafts();
  }

  renderDrafts() {
    if (!this.draftsBar || !this.draftsList) return;
    this.draftsBar.hidden = this.drafts.length === 0;
    if (this.draftsToggle) this.draftsToggle.textContent = `Drafts (${this.drafts.length})`;
    this.draftsList.replaceChildren?.();
    for (const draft of this.drafts) {
      const item = document.createElement("li");
      const restore = document.createElement("button");
      restore.type = "button";
      restore.className = "draft-restore";
      restore.textContent = draft;
      restore.title = "Put this back in the input";
      restore.addEventListener("click", () => this.restoreDraft(draft));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "draft-remove";
      remove.textContent = "×";
      remove.title = "Discard this draft";
      remove.addEventListener("click", () => this.removeDraft(draft));
      item.append?.(restore, remove);
      this.draftsList.appendChild(item);
    }
  }

  currentInput() {
    return this.isMobile() ? this.mobileInput : this.input.value;
  }

  setInput(text) {
    if (this.isMobile()) {
      this.mobileInput = text;
      this.updateMobileDisplay();
    } else {
      this.input.value = text;
      this.input.focus();
      this.input.setSelectionRange(text.length, text.length);
    }
  }

  submit() {
    const source = this.currentInput().trim();
    if (!source) return;
    this.setInput("");
    this.run(source);
  }

  /** Evaluate one input and append it with its result. */
  run(source) {
    this.history.push(source);
    this.historyIndex = -1;
    const command = source.trim().toLowerCase();
    const result = command === "help" || command === ".help"
      ? { ok: true, text: HELP_TEXT, value: undefined }
      : this.session.evaluate(source);
    this.addEntry(source, result);
    return result;
  }

  addEntry(source, result) {
    if (source === "clear()" && result.ok) return;
    const entry = document.createElement("div");
    entry.className = "output-entry";
    const inputLine = document.createElement("div");
    inputLine.className = "input-line";
    inputLine.innerHTML = '<span class="prompt">></span><span class="input-text"></span><span class="reload-icon" title="Reload expression">↻</span>';
    inputLine.querySelector(".input-text").textContent = source;
    inputLine.addEventListener("click", () => this.recall(source));
    entry.appendChild(inputLine);

    const outputLine = document.createElement("div");
    outputLine.className = result.ok ? "output-line" : "error-line";
    outputLine.textContent = result.text;
    if (result.ok && result.value !== undefined) {
      const inject = document.createElement("span");
      inject.className = "inject-icon";
      inject.title = "Use the value (ans)";
      inject.textContent = "→";
      outputLine.appendChild(inject);
      outputLine.addEventListener("click", (event) => {
        if (event.target.classList.contains("viz-icon")) return;
        this.insertAtCursor(this.injection(result.value));
      });
      if (result.value instanceof RationalInterval) {
        const viz = document.createElement("span");
        viz.className = "viz-icon";
        viz.title = "Visualize interval";
        viz.textContent = "📊";
        viz.addEventListener("click", (event) => {
          event.stopPropagation();
          this.showVisualization(result.value);
        });
        outputLine.appendChild(viz);
      }
    }
    entry.appendChild(outputLine);
    this.output.appendChild(entry);
    this.transcript.push(`> ${source}\n${result.text}`);
    requestAnimationFrame(() => { this.output.scrollTop = this.output.scrollHeight; });
  }

  /** Source text that recreates a value: Core values as R`...`. */
  injection(value) {
    if (value instanceof RationalInterval) return `R\`${value.low}:${value.high}\``;
    if (value?.constructor?.name === "Rational" || value?.constructor?.name === "Integer") return `R\`${value}\``;
    return "ans";
  }

  insertAtCursor(text) {
    if (this.isMobile()) {
      this.mobileInput += text;
      this.updateMobileDisplay();
      return;
    }
    const { selectionStart: start, selectionEnd: end, value } = this.input;
    this.input.value = value.slice(0, start) + text + value.slice(end);
    this.input.selectionStart = this.input.selectionEnd = start + text.length;
    this.input.focus();
  }

  backspace() {
    if (this.isMobile()) {
      this.mobileInput = this.mobileInput.slice(0, -1);
      this.updateMobileDisplay();
      return;
    }
    const { selectionStart: start, selectionEnd: end, value } = this.input;
    const from = start === end ? Math.max(0, start - 1) : start;
    this.input.value = value.slice(0, from) + value.slice(end);
    this.input.selectionStart = this.input.selectionEnd = from;
    this.input.focus();
  }

  setupKeypad() {
    for (const button of this.root.querySelectorAll(".keypad-btn[data-key]")) {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this.insertAtCursor(button.dataset.key);
      });
    }
    const actions = {
      backspace: () => this.backspace(),
      clear: () => this.clearInput(),
      enter: () => this.submit(),
      help: () => this.showHelp(),
      command: () => this.commandPanel.classList.add("show"),
    };
    for (const button of this.root.querySelectorAll(".keypad-btn[data-action]")) {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        actions[button.dataset.action]?.();
      });
    }
    this.$("closeCommandPanel").addEventListener("click", () => this.commandPanel.classList.remove("show"));
    for (const button of this.root.querySelectorAll(".command-btn")) {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this.commandPanel.classList.remove("show");
        this.run(button.dataset.command);
      });
    }
    if (this.isMobile()) {
      for (const [name, value] of [["inputmode", "none"], ["autocomplete", "off"], ["autocorrect", "off"], ["autocapitalize", "off"]]) {
        this.input.setAttribute(name, value);
      }
      this.keypad.classList.add("show");
      document.body.classList.add("keypad-visible");
      this.updateMobileDisplay();
    }
  }

  updateMobileDisplay() {
    if (!this.mobileDisplay) return;
    this.mobileDisplay.innerHTML = '<span class="mobile-prompt">></span> <span class="mobile-text"></span>';
    this.mobileDisplay.querySelector(".mobile-text").textContent = this.mobileInput;
    this.mobileDisplay.style.display = document.body.classList.contains("keypad-visible") ? "flex" : "none";
    this.output.scrollTop = this.output.scrollHeight;
  }

  displayWelcome() {
    const welcome = document.createElement("div");
    welcome.className = "output-entry welcome";
    welcome.innerHTML = `
      <div class="output-line no-mobile" style="color: #059669; font-weight: 600;">Welcome to RatCalc — JavaScript with exact rational arithmetic.</div>
      <div class="output-line no-mobile">Try <code>R\`1:2 + 3\`</code>, <code>let x = R\`1/3\`</code>, or <code>[1, 2, 3].map(n =&gt; R\`1/\${n}\`)</code>.</div>
      <div class="output-line no-mobile">Type <code>help()</code> or use the Help button.</div>`;
    this.output.appendChild(welcome);
  }

  clearOutput() {
    this.output.innerHTML = "";
    this.transcript = [];
    this.displayWelcome();
  }

  showHelp() {
    this.helpModal.style.display = "block";
  }

  hideModal(modal) {
    if (modal === this.visualizationModal) return this.hideVisualization();
    modal.style.display = "none";
    if (!this.isMobile()) setTimeout(() => this.input.focus(), 50);
  }

  async copySession() {
    const text = this.transcript.join("\n");
    const label = this.copyButton.textContent;
    try {
      if (!text) throw new Error("empty");
      await navigator.clipboard.writeText(text);
      this.copyButton.textContent = "Copied";
    } catch {
      this.copyButton.textContent = text ? "Copy failed" : "Nothing to copy";
    }
    setTimeout(() => { this.copyButton.textContent = label; }, 1500);
  }

  showVisualization(interval) {
    this.visualizationContainer.innerHTML = "";
    this.visualization?.destroy?.();
    this.visualization = new IntervalVisualization(this.visualizationContainer, {
      width: this.visualizationContainer.clientWidth || Math.min(window.innerWidth - 100, 800),
      height: 200,
    });
    // No expression label: the endpoints can be dragged, so the label shows them.
    this.visualization.addInterval(interval, { label: "", color: "#2563eb", draggable: true });
    this.updateStepSize();
    this.visualizationModal.style.display = "block";
  }

  hideVisualization() {
    this.visualizationModal.style.display = "none";
    this.visualization?.destroy?.();
    this.visualization = null;
  }

  updateStepSize() {
    const n = Math.max(1, Number.parseInt(this.stepSizeInput.value, 10) || 10);
    this.visualization?.setDragStepSize?.(this.session.evaluate(`R\`1/${n}\``).value);
  }

  saveVisualization() {
    const interval = this.visualization?.intervals?.[0]?.interval;
    if (!interval) return;
    this.insertAtCursor(this.injection(interval));
    this.hideVisualization();
  }

  download(name, type, data) {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([data], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }
}

if (typeof document !== "undefined" && typeof document.getElementById === "function" && document.getElementById("calculatorInput")) {
  globalThis.ratcalc = new WebCalculator(document);
}
