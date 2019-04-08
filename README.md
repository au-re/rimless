[npm-url]: https://www.npmjs.com/package/@au-re/anchor
[npm-image]: https://badge.fury.io/js/postmate.svg
[commitizen-url]: http://commitizen.github.io/cz-cli/
[commitizen-image]: https://img.shields.io/badge/commitizen-friendly-brightgreen.svg

# anchor

> iframe communication made easy with a promise-based API wrapping `postMessage`

[![npm][npm-image]][npm-url]
[![Commitizen friendly][commitizen-image]][commitizen-url]

Create a schema defining the API your iframe will present to its host and vice versa. Then simply connect the two and `anchor` will take care of the rest.

**In the host website**

```js
import { host }  from "@au-re/anchor";

const iframe = document.getElementById("myIframe");

// returns the guest object with the API defined by the guest
const guest = await host.connect(iframe, {
  sayHiToGuest: () => "hello guest!";
});

// with the guest object we can now run actions on the iframe
const res = await guest.sayHiToHost();
console.log(res); // "hello host!"
```
**In the guest website**

```js
import { guest }  from "@au-re/anchor";

// returns the host object with the API defined by the host
const host = await guest.connect({
  sayHiToHost: () => "hello host!";
});

// with the host object we can now run actions on the host
const res = await host.sayHiToGuest();
console.log(res); // "hello guest!"
```

## Alternatives

This library is inspired by [Postmate]() and [Penpal]().

### Why does this library exists?

It solves several shortcommings of the previously mentioned two libraries:

- does not create the iframe (easier to work with libraries like react)
- works with iframes using srcdoc
- works with multiple iframes from the same origin

## Installing

Anchor can be installed via [npm]().

```
$ npm i -S @au-re/anchor
```

Loading from a CDN

```html
<script src="unpkg.com/@au-re/anchor/umd/anchor.production.min.js"></script>
```

## Usage

TODO: write me

## API

TODO: write me

## Overview

1. The guest (iframe) sends a handshake request to the host with a schema describing its API
2. The host confirms the handshake and returns a schema with its own API

Now both can make use of the APIs they have shared with each other, e.g.

3. The guest requests `someAction` on the parent.
4. After verifying the origin, the parent will execute the function mapped to `someAction` and the value is returned to the guest.

## Contributing

We use the [airbnb style guide](https://github.com/airbnb/javascript) when writing javascript, with
some minor modifications. Make sure eslint is installed and running before making changes, as it
will ensure your coding style matches that of the project.

We use [commitizen](https://github.com/commitizen/cz-cli) and
[angular's conventional changelog](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#commits)
to enforce a consistent commit format. When writing commits, make sure you run `npm run commit`
instead of `git commit`.

### Scripts

A set of scripts are provided for you to test, build and analyze the project.

## License

MIT