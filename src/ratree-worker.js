/**
 * RatTree's function worker: runs user JavaScript off the page's thread. The
 * page enforces a time limit by terminating this worker. Network and messaging
 * globals are removed before any user code runs; user code also sees them
 * shadowed as undefined (ratree-scope.js).
 */
import { handleRequest } from "./ratree-runtime.js";

const reply = self.postMessage.bind(self);
const listen = self.addEventListener.bind(self);

for (const name of ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "Worker", "SharedWorker", "BroadcastChannel", "indexedDB", "caches"]) {
  try {
    Object.defineProperty(self, name, { value: undefined, configurable: false, writable: false });
  } catch {
    // Some globals are not configurable; user code still sees them shadowed.
  }
}

listen("message", (event) => {
  const { id, ...message } = event.data ?? {};
  reply({ id, ...handleRequest(message) });
});
