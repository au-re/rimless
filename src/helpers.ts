import { IRPCRequestPayload, IRPCResolvePayload, ISchema, events } from "./types";

export const CONNECTION_TIMEOUT = 1000;

export function isTrustedRemote(event: any) {
  return true;
}

export function generateID(): string {
  return "1";
}

const urlRegex = /^(https?:|file:)?\/\/([^/:]+)?(:(\d+))?/;
const ports: any = {
  "http:": "80",
  "https:": "443"
};

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
  const portSuffix = port && port !== ports[protocol] ? `:${port}` : '';
  return `${protocol}//${hostname}${portSuffix}`;
};
