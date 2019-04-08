import { ISchema } from "./types";

export const CONNECTION_TIMEOUT = 1000;

// check if the remote is trusted
export function isTrustedRemote(event: any) {
  // TODO: implement
  return true;
}

export function getDeepValue(obj: any, path: string) {
  for (const node of path.split(".")) {
    obj = obj[node];
  }
  return obj;
}

// we cannot send functions through postMessage
// remove function definition from the schema and replace them with type
export function mapDeep(obj: any) {
  for (const prop in obj) {
    if (obj[prop] === Object(obj[prop])) mapDeep(obj[prop]);
    if (typeof obj[prop] === "function") {
      obj[`@RPC_${prop}`] = true;
      delete obj[prop];
    }
  }
  return obj;
}

const urlRegex = /^(https?:|file:)?\/\/([^/:]+)?(:(\d+))?/;
const ports: any = { "http:": "80", "https:": "443" };

/**
 * convert the url into an origin (remove paths)
 *
 * @param url
 */
export function getOriginFromURL(url: string | null) {

  const location = document.location;

  const regexResult = urlRegex.exec(url || "");
  let protocol;
  let hostname;
  let port;

  if (regexResult) {
    // It's an absolute URL. Use the parsed info.
    // regexResult[1] will be undefined if the URL starts with //
    protocol = regexResult[1] ? regexResult[1] : location.protocol;
    hostname = regexResult[2];
    port = regexResult[4];
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
