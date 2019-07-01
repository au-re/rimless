[npm-url]: https://www.npmjs.com/package/rimless
[npm-image]: https://badge.fury.io/js/rimless.svg
[commitizen-url]: http://commitizen.github.io/cz-cli/
[commitizen-image]: https://img.shields.io/badge/commitizen-friendly-brightgreen.svg
[license-url]: https://github.com/au-re/rimless/LICENSE

<p align="center">
  <img src="https://raw.githubusercontent.com/au-re/rimless/master/assets/rimless.png"/>
</p>

# rimless

[![npm][npm-image]][npm-url]
[![Commitizen friendly][commitizen-image]][commitizen-url]

> Rimless makes event based communication easy with a promise-based API wrapping [postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage). Works with both **iframes** and **webworkers**.

You can use `rimless` to call remote procedures, exchange data or expose local functions with **iframes**/**webworkers**.

You can see it in action here https://au-re.github.io/rimless.

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

**in the host website**

```js
import { host }  from "rimless";

const connection = await host.connect(iframe, {
  myVariable: 12,
  myFunction: (value) => `hello ${value}`,
});

// access variables on the iframe
console.log(connection.remote.myIframeVariable);  // 42

// call remote procedures on the iframe
const result = await connection.remote.myIframeFunction("here");
console.log(result);  // hello here   

// close the connection
connection.close();
```
**in the iframe**

```js
import { guest }  from "rimless";

const connection = await guest.connect({
  myIframeVariable: 42,
  myIframeFunction: (value) => `hello ${value}`,
});

// access variables on the host
console.log(connection.remote.myVariable); // 12

// call remote procedures on host
const res = await connection.remote.myFunction("there");
console.log(res);   // hello there

// close the connection
connection.close();
```

---

## Getting Started

This is how you can **connect your website** to an iframe or webworker:

```js
import { host }  from "rimless";

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
import { guest }  from "rimless";

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

To do anything meaningfull with this connection you need to provide a schema that defines **the API** of the host/iframe/webworker. Any serializeable values as well as functions are ok to use. In the example below the host website provides a function that will update its background color when invoked.

```js
import { host }  from "rimless";

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
import { guest }  from "rimless";

// connect returns a promise that resolves in a connection object
// `connection.remote` contains the api you can invoke
guest.connect().then((connection) => {
  connection.remote.setColor("#011627");
});
```

### Closing a connection

Closing a connection will remove all event listeners that were registered.

```js
import { guest }  from "rimless";

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

All parameters passed through `postMessage` need to be serializeable. This applies also for all return values of the functions you expose.

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
- does not create the iframe (easier to work with libraries like react)
- works with iframes using srcdoc
- works with multiple iframes from the same origin

---

## API

Rimless exports two objects: `host` and  `guest`.

> ### `host.connect`

Connect your website to a "guest" (iframe/webworker).

```js
host.connect(iframe, { 
  log: (value) => console.log(value)
});
```

| Name | Type | Description | Required |
| --- | --- | --- | --- |
| `guest` | `HTMLIFrameElement` or `Worker` | Target of the connection | required |
| `schema` | `object` | schema of the api you want to expose | - |
| `options` | `object` | - | - |


> ### `guest.connect`

Connect a "guest" to your website. The guest connection automatically happens based on the environment it is run.

```js
guest.connect({ 
  log: (value) => console.log(value)
});
```

| Name | Type | Description | Default |
| --- | --- | --- | --- |
| `schema` | `object` | schema of the api you want to expose | - |
| `options` | `object` | - | - |

---

## Contributing

We use the [airbnb style guide](https://github.com/airbnb/javascript) when writing javascript, with
some minor modifications. Make sure eslint is installed and running before making changes, as it
will ensure your coding style matches that of the project.

We use [commitizen](https://github.com/commitizen/cz-cli) and
[angular's conventional changelog](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#commits)
to enforce a consistent commit format. When writing commits, make sure you run `npm run commit`
instead of `git commit`.

## License

[MIT](license-url)
