export const CONNECTION_TIMEOUT = 1000;

/**
 * check if the remote is trusted
 *
 * @param event
 */
export function isTrustedRemote(_event: any) {
  // TODO: implement
  return true;
}

/**
 * check if run in a webworker
 *
 * @param event
 */
export function isWorker() {
  return typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
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
  const { location } = document;

  const regexResult = urlRegex.exec(url || "");
  let protocol;
  let hostname;
  let port;

  if (regexResult) {
    // It's an absolute URL. Use the parsed info.
    // regexResult[1] will be undefined if the URL starts with //
    [, protocol = location.protocol, hostname, , port] = regexResult;
  } else {
    // It's a relative path. Use the current location's info.
    protocol = location.protocol;
    hostname = location.hostname;
    port = location.port;
  }

  // If the protocol is file, the origin is "null"
  // The origin of a document with file protocol is an opaque origin
  // and its serialization "null" [1]
  // [1] https://html.spec.whatwg.org/multipage/origin.html#origin
  if (protocol === "file:") {
    return "null";
  }

  // If the port is the default for the protocol, we don't want to add it to the origin string
  // or it won't match the message's event.origin.
  const portSuffix = port && port !== ports[protocol] ? `:${port}` : "";
  return `${protocol}//${hostname}${portSuffix}`;
}
