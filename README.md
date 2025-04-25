[npm-url]: https://www.npmjs.com/package/rimless
[npm-image]: https://badge.fury.io/js/rimless.svg
[commitizen-url]: http://commitizen.github.io/cz-cli/
[commitizen-image]: https://img.shields.io/badge/commitizen-friendly-brightgreen.svg
[license-url]: https://github.com/jamdotdev/rimless/LICENSE

<p align="center">
  <img src="https://raw.githubusercontent.com/jamdotdev/rimless/master/assets/icon.png"/>
</p>

# rimless

[![npm][npm-image]][npm-url]
[![Commitizen friendly][commitizen-image]][commitizen-url]
![npm bundle size](https://img.shields.io/bundlephobia/minzip/rimless)

> Rimless makes event based communication easy with a promise-based API wrapping [postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage). Works with **iframes**, **webworkers**, and **Node.js worker threads**.

You can use `rimless` to call remote procedures, exchange data or expose local functions with **iframes**, **webworkers**, or **Node.js workers**.

You can see it in action in the code sandbox below:

<a href="https://codesandbox.io/p/sandbox/3qrqfl">

![CodeSandbox](https://img.shields.io/badge/Codesandbox-040404?style=for-the-badge&logo=codesandbox&logoColor=DBDBDB)

</a>

## Installation

Rimless can be installed via [npm](https://www.npmjs.com/package/rimless).

```
$ npm i -S rimless
```

or from a CDN

```html
<script src="https://unpkg.com/rimless/lib/rimless.min.js"></script>
```

## Example Usage

Below is a minimal but complete round‑trip that shows how each side can:

1. expose variables and functions,
2. read the other side’s variables,
3. invoke the other side’s functions,
4. finally close the link.

**Host (page that embeds the iframe)**

```js
import { host } from "rimless";

const iframe = document.getElementById("myIframe");

// Everything inside this object is exported to the guest
const hostApi = {
  someHostVariable: 12,
  someHostFunction: (value) => `hello ${value}`,
};

const connection = await host.connect(iframe, hostApi);

// ↘︎  Access data that the iframe exposed
console.log(connection.remote.someGuestVariable); // → 42

// ↘︎  Call a guest‑side RPC and await its result
const result = await connection.remote.someGuestFunction("here");
console.log(result); // → "hello here"

// Done talking? Tear down the channel.
connection.close();
```

**Guest (code that runs inside the iframe)**

```js
import { guest } from "rimless";

// The object you pass to guest.connect is your public surface
const guestApi = {
  someGuestVariable: 42,
  someGuestFunction: (value) => `hello ${value}`,
};

const connection = await guest.connect(guestApi);

// ↗︎  Read a host‑side value
console.log(connection.remote.someHostVariable); // → 12

// ↗︎  Invoke a host‑side RPC
const res = await connection.remote.someHostFunction("there");
console.log(res); // → "hello there"

// Close when finished to free resources
connection.close();
```

**What to remember**

- `connection.remote` is the automatically generated proxy for the other side’s exports.
- Every remote call returns a Promise, so feel free to await it.
- Always call `connection.close()` when you no longer need the tunnel—this removes event listeners and avoids memory leaks.

---

## Getting Started

This is how you can **connect your website** to an iframe or webworker:

```js
import { host } from "rimless";

const iframe = document.getElementById("myIframe");
const worker = new Worker("myWorker");

// connect to the iframe
host.connect(iframe);

// connect to the worker
host.connect(worker);
```

You also need to **connect your iframe/webworker** to the host website.

Usage from an iframe:

```js
import { guest } from "rimless";

// connect to the parent website
guest.connect();
```

Usage from a webworker:

```js
importScripts("https://unpkg.com/rimless/lib/rimless.min.js");

const { guest } = rimless;

// connect to the parent website
guest.connect();
```

### Exposing an API

To do anything meaningful with this connection you need to provide a schema that defines **the API** of the host/iframe/webworker. Any serializable values as well as functions are ok to use. In the example below the host website provides a function that will update its background color when invoked.

```js
import { host } from "rimless";

const api = {
  setColor: (color) => {
    document.body.style.background = color;
  },
};

const iframe = document.getElementById("myIframe");

host.connect(iframe, api);
```

The api schema must be passed on connection, the same applies to the `iframe/webworker`.

### Calling an RPC

With the host API exposed we can now invoke the remote procedure from the iframe.

```js
import { guest } from "rimless";

// connect returns a promise that resolves in a connection object
// `connection.remote` contains the api you can invoke
guest.connect().then((connection) => {
  connection.remote.setColor("#011627");
});
```

### Calling the remote from an RPC

Every RPC handler you expose receives the caller’s method collection as its last parameter—conventionally named `remote`.
That means an RPC can immediately call back into the opposite context to acknowledge success, return extra data, or kick‑off a follow‑up action.

**Why it’s useful**

- Confirm completion – send a quick “done!” message when a long‑running task finishes.
- Chain operations – perform a host‑side update, then ask the guest to re‑render.
- Stream results – push incremental data to the caller instead of waiting for one big response.

```js
// host (parent window)
import { host } from "rimless";

const api = {
  /**
   * Change the page background, then notify the guest.
   * @param {string} color  Hex or CSS color string
   * @param {object} remote Automatically injected guest‑side RPCs
   */
  setColor: (color, remote) => {
    document.body.style.background = color;
    remote.logMessage("Background updated ✔");
  },
};

const iframe = document.getElementById("myIframe");
host.connect(iframe, api);
```

```js
// guest (inside the iframe)
import { guest } from "rimless";

const api = {
  /** Show messages from the host */
  logMessage: (msg) => console.log(msg),
};

const { remote } = await guest.connect(api);

// Ask the host to change its background.
// Afterwards, the guest will receive logMessage("Background updated ✔").
remote.setColor("#011627");
```

**Key points**

- Handler signature – (…args, remote); you can ignore remote if you don’t need it.
- Promises everywhere – RPC calls return promises, so you can await remote.someMethod().
- Keep it short – avoid deep call‑chains that bounce endlessly between host and guest.

### Closing a connection

Closing a connection will remove all event listeners that were registered.

```js
import { guest } from "rimless";

guest.connect().then((connection) => {
  connection.close();
});
```

---

## How it Works

1. The guest (iframe/webworker) sends a handshake request to the host with a schema describing its API
2. The host confirms the handshake and returns a schema with its own API

Now both can make use of the APIs they have shared with each other, e.g.

3. The guest requests `someAction` on the parent.
4. After verifying the origin, the parent will execute the function mapped to `someAction` and the result is returned to the guest.

## Limitations

All parameters passed through `postMessage` need to be serializable. This applies also for all return values of the functions you expose.

```js
// someFunction would return undefined when called in the remote.
const api = {
  someFunction: () => () => {},
};
```

## Alternatives

This library is inspired by [Postmate](https://www.npmjs.com/package/postmate) and [Penpal](https://www.npmjs.com/package/penpal).

### So why does this library exist?

- works with webworkers!
- works with Node.js worker threads
- does not create the iframe (easier to work with libraries like react)
- works with iframes using srcdoc
- works with multiple iframes from the same origin
- remote RPC handlers receive the caller's API as the last argument

---

## API

Rimless exports two objects: `host` and `guest`.

> ### `host.connect`

Connect your website to a "guest" (iframe/webworker).

```js
host.connect(iframe, {
  log: (value) => console.log(value),
});
```

| Name      | Type                            | Description                          | Required |
| --------- | ------------------------------- | ------------------------------------ | -------- |
| `guest`   | `HTMLIFrameElement` or `Worker` | Target of the connection             | required |
| `schema`  | `object`                        | schema of the api you want to expose | -        |

> ### `guest.connect`

Connect a "guest" to your website. The guest connection automatically happens based on the environment it is run.

```js
guest.connect({
  log: (value) => console.log(value),
});
```

| Name      | Type     | Description                          | Default |
| --------- | -------- | ------------------------------------ | ------- |
| `schema`  | `object` | schema of the api you want to expose | -       |
| `eventHandlers` | `object` | lifecycle callbacks like `onConnectionSetup` | - |

`onConnectionSetup(remote)` is called once the handshake completes. It receives the remote API so you can perform setup logic before using the connection.

---

## License

[MIT](license-url)
