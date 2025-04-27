import { Guest, NodeWorker, Target, WorkerLike } from "./types";

/**
 * check if run in a webworker
 *
 * @returns boolean
 */
export function isWorker(): boolean {
  return typeof window === "undefined" && typeof self !== "undefined";
}

/**
 * check if run in a Node.js environment
 *
 * @returns boolean
 */
export function isNodeEnv(): boolean {
  return typeof process !== "undefined" && !!(process as any).versions?.node;
}

/**
 * check if run in an iframe
 *
 * @returns boolean
 */
export function isIframe() {
  return window.self !== window.top;
}

/**
 * we cannot send functions through postMessage
 * extract the path to all functions in the schema
 *
 * @param obj
 */
export function extractMethods(obj: any) {
  const methods: Record<string, (...args: any) => any> = {};
  (function parse(obj: any, path = "") {
    Object.keys(obj).forEach((prop) => {
      const propPath = path ? `${path}.${prop}` : prop;
      if (obj[prop] === Object(obj[prop])) {
        parse(obj[prop], propPath);
      }
      if (typeof obj[prop] === "function") {
        methods[propPath] = obj[prop];
        delete obj[prop];
      }
    });
  })(obj);
  return methods;
}

const urlRegex = /^(https?:|file:)?\/\/([^/:]+)?(:(\d+))?/;
const ports: any = { "http:": "80", "https:": "443" };

/**
 * convert the url into an origin (remove paths)
 *
 * @param url
 */
export function getOriginFromURL(url: string | null) {
  if (!url) return null;

  const regexResult = urlRegex.exec(url);
  if (!regexResult) return null;

  const [, protocol = "http:", hostname, , port] = regexResult;

  // If the protocol is file, return file://
  if (protocol === "file:") {
    return "file://";
  }

  // If the port is the default for the protocol, we don't want to add it to the origin string
  const portSuffix = port && port !== ports[protocol] ? `:${port}` : "";
  return `${protocol}//${hostname}${portSuffix}`;
}

export function get(obj: any, path: string | Array<string | number>, defaultValue?: any): any {
  const keys = Array.isArray(path) ? path : path.split(".").filter(Boolean);
  let result = obj;

  for (const key of keys) {
    result = result?.[key];
    if (result === undefined) {
      return defaultValue;
    }
  }

  return result;
}

export function set(obj: any, path: string | (string | number)[], value: any): any {
  if (!obj || typeof obj !== "object") return obj;

  const pathArray = Array.isArray(path) ? path : path.split(".").map((key) => (key.match(/^\d+$/) ? Number(key) : key));

  let current = obj;

  for (let i = 0; i < pathArray.length; i++) {
    const key = pathArray[i];

    if (i === pathArray.length - 1) {
      current[key] = value;
    } else {
      if (!current[key] || typeof current[key] !== "object") {
        current[key] = typeof pathArray[i + 1] === "number" ? [] : {};
      }
      current = current[key];
    }
  }

  return obj;
}

export function generateId(length: number = 10): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

let parentPort: any = null;

if (isNodeEnv()) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const workerThreads = require("worker_threads");
    parentPort = workerThreads.parentPort;
  } catch (e) {
    // Not in worker thread context
  }
}

/**
 * Get the appropriate target host for messaging based on the current environment
 * @returns The messaging target for the current environment
 */
export function getTargetHost(): any {
  if (isNodeEnv()) {
    return parentPort;
  }

  if (isWorker()) {
    return self;
  }

  if (isIframe()) {
    return window.parent;
  }

  throw new Error("No valid target found for postMessage");
}

/**
 * Send a message to a target, handling different environments (iframe, web worker, node worker)
 * @param target The target to send the message to
 * @param message The message to send
 * @param origin Optional origin for iframe communication
 */
export function postMessageToTarget(target: Target, message: any, origin?: string): void {
  if (!target) {
    throw new Error("Rimless Error: No target specified for postMessage");
  }

  // Node.js Worker
  if (isNodeEnv() && target === parentPort) {
    target.postMessage(JSON.parse(JSON.stringify(message)));
    return;
  }

  // Web Worker
  if (isWorker()) {
    target.postMessage(JSON.parse(JSON.stringify(message)));
    return;
  }

  // iframe or window
  if (target.postMessage) {
    target.postMessage(JSON.parse(JSON.stringify(message)), { targetOrigin: origin || "*" });
    return;
  }

  throw new Error("Rimless Error: Invalid target for postMessage");
}

export function isNodeWorker(guest: Guest | Target): guest is NodeWorker {
  return parentPort !== null && guest === parentPort;
}

export function isWorkerLike(guest: Guest): guest is WorkerLike {
  return isNodeWorker(guest) || (typeof Worker !== "undefined" && guest instanceof Worker);
}

export function addEventListener(target: Target, event: string, handler: EventListenerOrEventListenerObject) {
  if (isNodeWorker(target)) {
    target.on(event, handler);
  } else if ("addEventListener" in target) {
    target.addEventListener(event, handler);
  }
}

export function removeEventListener(target: Target, event: string, handler: EventListenerOrEventListenerObject) {
  if (isNodeWorker(target)) {
    target.off(event, handler);
  } else if ("removeEventListener" in target) {
    target.removeEventListener(event, handler);
  }
}

/**
 * Normalize message event data across Web and Node.js environments
 * In web, data is in event.data
 * In Node.js, the event itself contains the data
 */
export function getEventData(event: any) {
  return event.data || event;
}
