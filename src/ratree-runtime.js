/**
 * Requests RatTree sends to its function worker, as plain JSON in and out.
 * Shared by the worker and the in-process fallback used in tests.
 *
 *   { type: "statuses", definitions, x, d }            -> each function's value at x
 *   { type: "expression", definitions, expression, x, d } -> the expression box's value
 *   { type: "test", definitions, name, code, x, d }     -> one (edited) function at x
 *   { type: "all", definitions, expression, x, d }      -> statuses and expression together
 * Values cross as Core JSON (toJSON / reviveCoreValue).
 */
import { reviveCoreValue } from "@ratmath/core";
import { buildFunctions, describeError } from "./ratree-scope.js";

const revive = (value) => JSON.parse(JSON.stringify(value), reviveCoreValue);
const encode = (value) => JSON.parse(JSON.stringify(value));
const failure = (error) => ({ ok: false, error: describeError(error), line: error?.functionLine ?? null, name: error?.functionName ?? null });

export function handleRequest(message) {
  const x = revive(message.x);
  const depth = Number(message.d ?? 0);
  try {
    if (message.type === "statuses" || message.type === "all") {
      const functions = buildFunctions(message.definitions, depth);
      const statuses = message.definitions.map(({ name }) => {
        try {
          return { name, ok: true, value: encode(functions.call(name, x)) };
        } catch (error) {
          return { name, ...failure(error) };
        }
      });
      if (message.type === "statuses") return { ok: true, statuses };
      let expression = null;
      if (String(message.expression ?? "").trim()) {
        try {
          expression = { ok: true, value: encode(functions.evaluate(message.expression, x)) };
        } catch (error) {
          expression = failure(error);
        }
      }
      return { ok: true, statuses, expression };
    }
    if (message.type === "expression") {
      const functions = buildFunctions(message.definitions, depth);
      return { ok: true, value: encode(functions.evaluate(message.expression, x)) };
    }
    if (message.type === "test") {
      const others = message.definitions.filter(({ name }) => name !== message.name && name !== message.originalName);
      const functions = buildFunctions([...others, { name: message.name, code: message.code }], depth);
      return { ok: true, value: encode(functions.call(message.name, x)) };
    }
    return { ok: false, error: `unknown request ${message.type}` };
  } catch (error) {
    return failure(error);
  }
}

export { revive };
