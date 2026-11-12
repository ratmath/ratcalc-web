/**
 * Main-thread side of RatTree's function worker: one request at a time, latest
 * wins, a time limit, and a Stop that terminates the worker. Outside a browser
 * page (tests), requests run in-process.
 */
import { handleRequest, revive } from "./ratree-runtime.js";

export class FunctionRunner {
  constructor({ workerUrl = "ratree-worker.js", timeoutMs = 3000, onBusy = () => {}, inProcess = typeof window === "undefined" || typeof Worker === "undefined" } = {}) {
    this.inProcess = inProcess;
    this.workerUrl = workerUrl;
    this.timeoutMs = timeoutMs;
    this.onBusy = onBusy;
    this.pending = null;
    this.nextId = 1;
    this.worker = null;
  }

  start() {
    if (this.inProcess) return null;
    this.worker = new Worker(this.workerUrl, { type: "module" });
    this.worker.addEventListener("message", (event) => this.receive(event.data));
    this.worker.addEventListener("error", (event) => {
      this.finish({ ok: false, error: `worker error: ${event.message ?? "failed to load"}` });
      this.restart();
    });
    return this.worker;
  }

  restart() {
    this.worker?.terminate();
    this.worker = null;
  }

  /** Send a request; resolves with { ok, ... } (values revived to Core objects). */
  request(message) {
    if (this.inProcess) return Promise.resolve(this.revive(handleRequest(JSON.parse(JSON.stringify(message)))));
    if (this.pending) {
      // Latest wins: a newer request replaces a running one.
      this.finish({ ok: false, superseded: true, error: "superseded" });
      this.restart();
    }
    if (!this.worker) this.start();
    const id = this.nextId++;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.finish({ ok: false, timedOut: true, error: `Stopped: took longer than ${this.timeoutMs / 1000} s` });
        this.restart();
      }, this.timeoutMs);
      this.pending = { id, resolve, timer };
      this.onBusy(true);
      this.worker.postMessage({ id, ...JSON.parse(JSON.stringify(message)) });
    });
  }

  /** Stop the running request now. */
  stop() {
    if (!this.pending) return;
    this.finish({ ok: false, stopped: true, error: "Stopped" });
    this.restart();
  }

  receive(data) {
    if (!this.pending || data?.id !== this.pending.id) return;
    this.finish(this.revive(data));
  }

  finish(result) {
    if (!this.pending) return;
    const { resolve, timer } = this.pending;
    clearTimeout(timer);
    this.pending = null;
    this.onBusy(false);
    resolve(result);
  }

  revive(result) {
    if (result.value !== undefined) result.value = revive(result.value);
    if (result.statuses) for (const status of result.statuses) if (status.value !== undefined) status.value = revive(status.value);
    if (result.expression?.value !== undefined) result.expression.value = revive(result.expression.value);
    return result;
  }
}
