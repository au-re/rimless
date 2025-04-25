/**
 * check if run in a webworker
 *
 * @param event
 */
export function isWorker(): boolean {
  return typeof window === "undefined" && typeof self !== "undefined";
}

/**
 * check if run in a Node.js environment
 */
export function isNodeEnv(): boolean {
  return typeof window === "undefined";
}

/**
 * we cannot send functions through postMessage
 * extract the path to all functions in the schema
 *
 * @param obj
 */
export function extractMethods(obj: any) {
  const paths: string[] = [];
  (function parse(obj: any, path = "") {
    Object.keys(obj).forEach((prop) => {
      const propPath = path ? `${path}.${prop}` : prop;
      if (obj[prop] === Object(obj[prop])) {
        parse(obj[prop], propPath);
      }
      if (typeof obj[prop] === "function") {
        paths.push(propPath);
      }
    });
  })(obj);
  return paths;
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

export interface NodeWorker {
  on(event: string, handler: any): void;
  off(event: string, handler: any): void;
  postMessage(message: any): void;
  terminate(): void;
}

// Type that captures common properties between Web Workers and Node Workers
export type WorkerLike = Worker | NodeWorker;

let NodeWorkerClass: any = null;

if (isNodeEnv()) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const workerThreads = require("worker_threads");
    NodeWorkerClass = workerThreads.Worker;
  } catch {}
}

export function isNodeWorker(target: any): target is NodeWorker {
  return NodeWorkerClass !== null && target instanceof NodeWorkerClass;
}

export function isWorkerLike(target: any): target is WorkerLike {
  return isNodeWorker(target) || target instanceof Worker;
}

export function addEventListener(target: Window | WorkerLike | HTMLIFrameElement, event: string, handler: any) {
  if (isNodeWorker(target)) {
    target.on(event, handler);
  } else if ("addEventListener" in target) {
    target.addEventListener(event, handler);
  }
}

export function removeEventListener(target: Window | WorkerLike | HTMLIFrameElement, event: string, handler: any) {
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
export function getEventData(event: any): any {
  return event.data || event;
}
