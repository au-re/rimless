# anchor

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)


## Usage

In the parent component:

```js
import { parent }  from "@au-re/anchor";

const child = await parent.connect(iframe, schema, options);

// we can now execute actions on the child
const res = await child.someAction();
```

In the child component:

```js
import { child }  from "@au-re/anchor";

const parent = await child.connect(schema, options);

// we can now execute actions on the parent
const res = await parent.someAction();
```

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
