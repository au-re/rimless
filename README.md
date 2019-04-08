# anchor

> iframe communication made easy with a promise-based API wrapping `postMessage`

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

Create a schema defining the API your iframe will present to its host.

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

In the parent component:

```js
import { host }  from "@au-re/anchor";

const guest = await host.connect(iframe, schema, options);

// we can now execute actions on the iframe
const res = await guest.someAction();
```

In the child component:

```js
import { guest }  from "@au-re/anchor";

const host = await guest.connect(schema, options);

// we can now execute actions on the host
const res = await host.someAction();
```

## Overview

1. The guest (iframe) sends a handshake request to the host with a schema describing its API
2. The host confirms the handshake and returns a schema with its own API

Now both can make use of the APIs they have shared with each other, e.g.

3. The guest requests `someAction` on the parent.
4. After verifying the origin, the parent will execute the function mapped to `someAction` and the value is returned to the guest.

## Scripts

A set of scripts are provided for you to test, build and analyze the project.

## Contributing

We use the [airbnb style guide](https://github.com/airbnb/javascript) when writing javascript, with
some minor modifications. Make sure eslint is installed and running before making changes, as it
will ensure your coding style matches that of the project.

We use [commitizen](https://github.com/commitizen/cz-cli) and
[angular's conventional changelog](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#commits)
to enforce a consistent commit format. When writing commits, make sure you run `npm run commit`
instead of `git commit`.

## License

MIT